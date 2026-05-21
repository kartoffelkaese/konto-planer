import type { Transaction } from '@/types'

export type RecurringWithStatus = Transaction & {
  dueInSalaryMonth?: boolean
  hasInstanceInSalaryMonth?: boolean
  hasUnconfirmedInstanceInSalaryMonth?: boolean
}

export function getRecurringSalaryMonthStatus(transaction: RecurringWithStatus): {
  label: string
  className: string
} {
  if (transaction.hasUnconfirmedInstanceInSalaryMonth) {
    return {
      label: 'Ausstehend im Gehaltsmonat',
      className: 'bg-pending-bg text-pending',
    }
  }
  if (transaction.hasInstanceInSalaryMonth) {
    return {
      label: 'Buchung im Gehaltsmonat vorhanden',
      className: 'bg-income-bg text-income',
    }
  }
  if (transaction.dueInSalaryMonth) {
    return {
      label: 'Fällig – unter Transaktionen „Ausstehende erstellen“',
      className: 'bg-accent-subtle text-accent',
    }
  }
  return {
    label: 'Aktuell nicht fällig',
    className: 'bg-surface-muted text-secondary',
  }
}
