import type { Account } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSalaryMonthRangeForDate } from '@/lib/dateUtils'
import { loadInstanceCounts, openDueDates } from '@/lib/recurringAutoPending'

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
 * als Buchung (die Vorlage ist die Buchung ihres eigenen Termins), sonst als Prognose aus der
 * Vorlage für spätere Termine im Gehaltsmonat. Bewusst gelöschte Termine (bis zur Marke der
 * Vorlage) zählen nicht. Buchungen nach dem Gehaltsmonat senken „Verfügbar“ erst in ihrem Monat.
 */
export async function getAvailableBalance(
  account: Pick<Account, 'id' | 'salaryDay'>,
  now: Date = new Date()
): Promise<AvailableBalance> {
  const salaryMonth = getSalaryMonthRangeForDate(account.salaryDay, now)

  const [confirmed, open, templates] = await Promise.all([
    prisma.transaction.aggregate({
      where: { accountId: account.id, isConfirmed: true },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        accountId: account.id,
        isConfirmed: false,
        amount: { lt: 0 },
        date: { lte: salaryMonth.endDate },
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

  const instanceCounts = await loadInstanceCounts(
    account.id,
    templates.map((t) => t.id),
    salaryMonth
  )
  const plannedRecurringExpenses = templates.reduce(
    (sum, template) =>
      sum +
      Math.abs(template.amount.toNumber()) *
        openDueDates(template, salaryMonth, salaryMonth.endDate, instanceCounts.get(template.id) ?? 0)
          .length,
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
