import type { Transaction } from '@/types'
import { formatDate } from '@/lib/dateUtils'

export type RecurringWithStatus = Transaction & {
  dueInSalaryMonth?: boolean
  hasInstanceInSalaryMonth?: boolean
  hasUnconfirmedInstanceInSalaryMonth?: boolean
  /** „Am Buchungstag“: nächster Termin im Gehaltsmonat, an dem automatisch eingetragen wird */
  autoPendingDate?: string | null
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
      label: 'Fällig – noch nicht eingetragen',
      className: 'bg-accent-subtle text-accent',
    }
  }
  if (transaction.autoPendingDate) {
    return {
      label: `Wird am ${formatDate(transaction.autoPendingDate)} eingetragen`,
      className: 'bg-surface-muted text-secondary',
    }
  }
  return {
    label: 'Aktuell nicht fällig',
    className: 'bg-surface-muted text-secondary',
  }
}
