export const RECURRING_INTERVALS = [
  {
    value: 'monthly',
    label: 'Monatlich',
    monthsPerStep: 1,
    monthsForMonthlyEquivalent: 1,
    badgeClassName: 'bg-income-bg text-income',
  },
  {
    value: 'quarterly',
    label: 'Vierteljährlich',
    monthsPerStep: 3,
    monthsForMonthlyEquivalent: 3,
    badgeClassName: 'bg-pending-bg text-pending',
  },
  {
    value: 'semiannual',
    label: 'Halbjährlich',
    monthsPerStep: 6,
    monthsForMonthlyEquivalent: 6,
    badgeClassName: 'bg-expense-bg text-expense',
  },
  {
    value: 'yearly',
    label: 'Jährlich',
    monthsPerStep: 12,
    monthsForMonthlyEquivalent: 12,
    badgeClassName: 'bg-accent-subtle text-accent',
  },
] as const

export type RecurringIntervalId = (typeof RECURRING_INTERVALS)[number]['value']

const intervalByValue = new Map(
  RECURRING_INTERVALS.map((interval) => [interval.value, interval])
)

export function isRecurringInterval(value: string): value is RecurringIntervalId {
  return intervalByValue.has(value as RecurringIntervalId)
}

export function getRecurringIntervalLabel(value: string | null | undefined): string {
  if (!value) return 'Monatlich'
  return intervalByValue.get(value as RecurringIntervalId)?.label ?? value
}

export function getRecurringIntervalBadgeClassName(
  value: string | null | undefined
): string {
  if (!value) {
    return intervalByValue.get('monthly')!.badgeClassName
  }
  return (
    intervalByValue.get(value as RecurringIntervalId)?.badgeClassName ??
    'bg-surface-muted text-secondary'
  )
}
