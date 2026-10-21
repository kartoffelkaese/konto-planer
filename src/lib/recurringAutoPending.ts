import type { Account, RecurringAutoMode, Transaction } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  berlinDayKey,
  getRecurringDueDatesInRange,
  getSalaryMonthRangeForDate,
  type RecurringInterval,
} from '@/lib/dateUtils'
import { buildRecurringInstanceData } from '@/lib/recurringInstances'
import {
  createTransferPair,
  resolveTransferSenderName,
  transactionTransferInclude,
} from '@/lib/transfers'

/**
 * Wiederkehrende Zahlungen automatisch als ausstehende Buchungen eintragen.
 *
 * Die Vorlage selbst ist die erste Buchung (an ihrem eigenen Datum); eingetragen werden nur die
 * späteren Termine. Je Gehaltsmonat gelten die ersten Termine als erledigt, wenn es dort schon
 * Buchungen der Vorlage gibt – egal an welchem Tag (z. B. auf den Abbuchungstag verschoben).
 *
 * Jede Vorlage merkt sich in `autoPendingUntil` den letzten Termin, der schon eingetragen
 * (oder bewusst übergangen) wurde. Eingetragen werden nur Termine danach – gelöschte oder per
 * „Rückgängig“ entfernte Buchungen kommen so nicht wieder. Vor dem Beginn des laufenden
 * Gehaltsmonats wird nie nachgetragen.
 */

export type DueTemplate = Pick<Transaction, 'id' | 'date' | 'recurringInterval' | 'autoPendingUntil'>

export type SalaryMonth = { startDate: Date; endDate: Date }

/** Bis zu welchem Tag ein Modus einträgt (`null` = gar nicht) */
export function autoPendingUntil(mode: RecurringAutoMode, salaryMonth: SalaryMonth, now: Date): Date | null {
  if (mode === 'SALARY_MONTH') return salaryMonth.endDate
  if (mode === 'ON_DUE_DATE') return now
  return null
}

/**
 * Offene Termine einer Vorlage im Gehaltsmonat bis `until`: ohne den Termin der Vorlage selbst,
 * ohne die schon durch `instanceCount` Buchungen erledigten und nur nach der Marke.
 */
export function openDueDates(
  template: DueTemplate,
  salaryMonth: SalaryMonth,
  until: Date,
  instanceCount = 0
): Date[] {
  const interval = (template.recurringInterval || 'monthly') as RecurringInterval
  const ownDay = berlinDayKey(template.date)
  const mark = template.autoPendingUntil ? berlinDayKey(template.autoPendingUntil) : null
  const untilDay = berlinDayKey(until)
  return getRecurringDueDatesInRange(template.date, interval, salaryMonth.startDate, salaryMonth.endDate)
    .filter((date) => berlinDayKey(date) !== ownDay)
    .slice(instanceCount)
    .filter((date) => {
      const day = berlinDayKey(date)
      return (mark === null || day > mark) && day <= untilDay
    })
}

/** Anzahl der Buchungen je Vorlage im Gehaltsmonat – an beliebigem Tag */
export async function loadInstanceCounts(
  accountId: string,
  templateIds: string[],
  salaryMonth: SalaryMonth
): Promise<Map<string, number>> {
  if (templateIds.length === 0) return new Map()
  const groups = await prisma.transaction.groupBy({
    by: ['parentTransactionId'],
    where: {
      accountId,
      isRecurring: false,
      parentTransactionId: { in: templateIds },
      date: { gte: salaryMonth.startDate, lte: salaryMonth.endDate },
    },
    _count: true,
  })
  return new Map(
    groups
      .filter((group) => group.parentTransactionId)
      .map((group) => [group.parentTransactionId!, group._count])
  )
}

export type AutoPendingAccount = Pick<
  Account,
  'id' | 'name' | 'salaryDay' | 'isSimpleAccount' | 'recurringAutoMode' | 'transferSenderName'
>

/**
 * Trägt die fälligen Termine des Kontos ein und liefert die neuen Buchungen.
 * Je Vorlage wird zuerst die Marke bedingt vorgerückt; nur wer sie vorrückt, legt an.
 * So entsteht auch bei gleichzeitigen Aufrufen (zwei Tabs) nichts doppelt.
 */
export async function createDuePendingInstances(account: AutoPendingAccount, now: Date = new Date()) {
  if (account.isSimpleAccount) return []
  const salaryMonth = getSalaryMonthRangeForDate(account.salaryDay, now)
  const until = autoPendingUntil(account.recurringAutoMode, salaryMonth, now)
  if (!until) return []

  const templates = await prisma.transaction.findMany({
    where: { accountId: account.id, isRecurring: true, isRecurringPaused: false, parentTransactionId: null },
    include: transactionTransferInclude,
  })
  const instanceCounts = await loadInstanceCounts(account.id, templates.map((t) => t.id), salaryMonth)

  const created = []
  for (const template of templates) {
    const dueDates = openDueDates(template, salaryMonth, until, instanceCounts.get(template.id) ?? 0)
    if (dueDates.length === 0) continue
    const newMark = dueDates[dueDates.length - 1]

    const instances = await prisma.$transaction(async (tx) => {
      const claimed = await tx.transaction.updateMany({
        where: {
          id: template.id,
          OR: [{ autoPendingUntil: null }, { autoPendingUntil: { lt: newMark } }],
        },
        data: { autoPendingUntil: newMark },
      })
      if (claimed.count === 0) return []

      const result = []
      for (const dueDate of dueDates) {
        const instance = await tx.transaction.create({
          data: buildRecurringInstanceData(template, dueDate, account.id, template.id),
        })
        if (template.isTransfer && template.transferTargetAccountId) {
          await createTransferPair(tx, instance, template.transferTargetAccountId, resolveTransferSenderName(account))
        }
        result.push(
          await tx.transaction.findUniqueOrThrow({ where: { id: instance.id }, include: transactionTransferInclude })
        )
      }
      return result
    })
    created.push(...instances)
  }
  return created
}
