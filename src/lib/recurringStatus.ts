import type { Transaction } from '@/types'

export type RecurringWithStatus = Transaction & {
  dueInSalaryMonth?: boolean
  hasInstanceInSalaryMonth?: boolean
  hasUnconfirmedInstanceInSalaryMonth?: boolean
}

export function isRecurringTemplateActive(t: {
  isRecurring: boolean
  isRecurringPaused?: boolean
}): boolean {
  return t.isRecurring && !t.isRecurringPaused
}

export function getRecurringSalaryMonthStatus(transaction: RecurringWithStatus): {
  label: string
  className: string
} {
  if (transaction.isRecurringPaused) {
    return {
      label: 'Pausiert',
      className: 'bg-surface-muted text-secondary',
    }
  }
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
