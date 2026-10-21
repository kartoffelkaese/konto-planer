import type { Account, RecurringAutoMode, Transaction } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  berlinDayKey,
  getRecurringDueDatesInRange,
  getSalaryMonthRangeForDate,
  type RecurringInterval,
} from '@/lib/dateUtils'
import { buildRecurringInstanceData, recurringInstanceKey } from '@/lib/recurringInstances'
import {
  createTransferPair,
  resolveTransferSenderName,
  transactionTransferInclude,
} from '@/lib/transfers'

/**
 * Wiederkehrende Zahlungen automatisch als ausstehende Buchungen eintragen.
 *
 * Jede Vorlage merkt sich in `autoPendingUntil` den letzten Termin, der schon eingetragen
 * (oder bewusst übergangen) wurde. Eingetragen werden nur Termine danach – gelöschte oder per
 * „Rückgängig“ entfernte Buchungen kommen so nicht wieder. Ohne Marke wird nie vor dem Beginn
 * des laufenden Gehaltsmonats nachgetragen.
 */

export type DueTemplate = Pick<Transaction, 'id' | 'date' | 'recurringInterval' | 'autoPendingUntil'>

export type SalaryMonth = { startDate: Date; endDate: Date }

/** Bis zu welchem Tag ein Modus einträgt (`null` = gar nicht) */
export function autoPendingUntil(mode: RecurringAutoMode, salaryMonth: SalaryMonth, now: Date): Date | null {
  if (mode === 'SALARY_MONTH') return salaryMonth.endDate
  if (mode === 'ON_DUE_DATE') return now
  return null
}

/** Termine einer Vorlage in [from, until], die nach ihrer Marke liegen */
export function openDueDates(template: DueTemplate, from: Date, until: Date): Date[] {
  const interval = (template.recurringInterval || 'monthly') as RecurringInterval
  const mark = template.autoPendingUntil ? berlinDayKey(template.autoPendingUntil) : null
  return getRecurringDueDatesInRange(template.date, interval, from, until).filter(
    (date) => mark === null || berlinDayKey(date) > mark
  )
}

/** Wie `openDueDates`, ohne Termine, für die es schon eine Buchung gibt */
export function openDueDatesWithoutInstance(
  template: DueTemplate,
  from: Date,
  until: Date,
  instanceKeys: Set<string>
): Date[] {
  return openDueDates(template, from, until).filter(
    (date) => !instanceKeys.has(recurringInstanceKey(template.id, date))
  )
}

/** Schlüssel der vorhandenen Instanzen der Vorlagen im Zeitraum */
export async function loadInstanceKeys(
  accountId: string,
  templateIds: string[],
  from: Date,
  until: Date
): Promise<Set<string>> {
  if (templateIds.length === 0) return new Set()
  const instances = await prisma.transaction.findMany({
    where: {
      accountId,
      isRecurring: false,
      parentTransactionId: { in: templateIds },
      date: { gte: from, lte: until },
    },
    select: { parentTransactionId: true, date: true },
  })
  return new Set(
    instances
      .filter((instance) => instance.parentTransactionId)
      .map((instance) => recurringInstanceKey(instance.parentTransactionId!, instance.date))
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
  const instanceKeys = await loadInstanceKeys(
    account.id,
    templates.map((t) => t.id),
    salaryMonth.startDate,
    until
  )

  const created = []
  for (const template of templates) {
    const dueDates = openDueDates(template, salaryMonth.startDate, until)
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
        if (instanceKeys.has(recurringInstanceKey(template.id, dueDate))) continue
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
