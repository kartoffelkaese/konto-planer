export type RecurringForTotals = {
  amount: number
  recurringInterval?: string | null
  isRecurringPaused?: boolean
}

export type RecurringTotals = {
  monthly: { total: number; perMonth: number }
  quarterly: { total: number; perMonth: number }
  yearly: { total: number; perMonth: number }
  totalMonthly: number
}

function sumAmounts(items: RecurringForTotals[]): number {
  return items.reduce((acc, t) => acc + t.amount, 0)
}

/** Monatliche Belastung aus wiederkehrenden Vorlagen (Vorlagenbeträge). */
export function computeRecurringTotals(
  transactions: RecurringForTotals[]
): RecurringTotals {
  const active = transactions.filter((t) => !t.isRecurringPaused)

  const monthly = active.filter((t) => t.recurringInterval === 'monthly')
  const quarterly = active.filter((t) => t.recurringInterval === 'quarterly')
  const yearly = active.filter((t) => t.recurringInterval === 'yearly')

  const monthlyTotal = sumAmounts(monthly)
  const quarterlyTotal = sumAmounts(quarterly)
  const yearlyTotal = sumAmounts(yearly)

  return {
    monthly: { total: monthlyTotal, perMonth: monthlyTotal },
    quarterly: {
      total: quarterlyTotal,
      perMonth: quarterlyTotal / 3,
    },
    yearly: {
      total: yearlyTotal,
      perMonth: yearlyTotal / 12,
    },
    totalMonthly: monthlyTotal + quarterlyTotal / 3 + yearlyTotal / 12,
  }
}
