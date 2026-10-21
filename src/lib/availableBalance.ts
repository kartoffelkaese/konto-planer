import type { Account, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSalaryMonthRangeForDate } from '@/lib/dateUtils'
import { loadInstanceKeys, openDueDatesWithoutInstance } from '@/lib/recurringAutoPending'

/** Vorlage einer wiederkehrenden Zahlung – keine Buchung, zählt nie in Summen */
export const NOT_RECURRING_TEMPLATE = {
  NOT: { isRecurring: true, parentTransactionId: null },
} satisfies Prisma.TransactionWhereInput

export type AvailableBalance = {
  /** Summe aller bestätigten Buchungen */
  clearedBalance: number
  /** Offene Ausgaben (Buchungen) bis zum Ende des Gehaltsmonats */
  openExpenses: number
  /** Termine wiederkehrender Ausgaben im Gehaltsmonat, die noch nicht eingetragen sind */
  plannedRecurringExpenses: number
  /** `openExpenses + plannedRecurringExpenses` */
  totalPendingExpenses: number
  /** Was am Ende des Gehaltsmonats frei bleibt */
  available: number
}

/**
 * „Verfügbar“ – für Übersicht und Buchungen gleich gerechnet. Jede Zahlung zählt genau einmal:
 * als Buchung, sobald sie eingetragen ist, sonst als Prognose aus ihrer Vorlage. Bewusst
 * gelöschte Termine (vor der Marke der Vorlage) zählen nicht. Buchungen nach dem Gehaltsmonat
 * senken „Verfügbar“ erst in ihrem Monat.
 */
export async function getAvailableBalance(
  account: Pick<Account, 'id' | 'salaryDay'>,
  now: Date = new Date()
): Promise<AvailableBalance> {
  const { startDate, endDate } = getSalaryMonthRangeForDate(account.salaryDay, now)

  const [confirmed, open, templates] = await Promise.all([
    prisma.transaction.aggregate({
      where: { accountId: account.id, isConfirmed: true, ...NOT_RECURRING_TEMPLATE },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        accountId: account.id,
        isConfirmed: false,
        amount: { lt: 0 },
        date: { lte: endDate },
        ...NOT_RECURRING_TEMPLATE,
      },
      _sum: { amount: true },
    }),
    prisma.transaction.findMany({
      where: {
        accountId: account.id,
        isRecurring: true,
        isRecurringPaused: false,
        parentTransactionId: null,
        amount: { lt: 0 },
      },
      select: { id: true, date: true, recurringInterval: true, autoPendingUntil: true, amount: true },
    }),
  ])

  const instanceKeys = await loadInstanceKeys(
    account.id,
    templates.map((t) => t.id),
    startDate,
    endDate
  )
  const plannedRecurringExpenses = templates.reduce(
    (sum, template) =>
      sum +
      Math.abs(template.amount.toNumber()) *
        openDueDatesWithoutInstance(template, startDate, endDate, instanceKeys).length,
    0
  )

  const clearedBalance = confirmed._sum.amount?.toNumber() || 0
  const openExpenses = Math.abs(open._sum.amount?.toNumber() || 0)
  const totalPendingExpenses = openExpenses + plannedRecurringExpenses
  return {
    clearedBalance,
    openExpenses,
    plannedRecurringExpenses,
    totalPendingExpenses,
    available: clearedBalance - totalPendingExpenses,
  }
}
