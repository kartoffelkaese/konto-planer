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

/** Mindestens eine aktive Vorlage ist im Gehaltsmonat fällig und hat noch keine Buchung – „Ausstehende erstellen“ hätte etwas zu tun */
export function hasDueRecurringWithoutInstance(templates: RecurringWithStatus[]): boolean {
  return templates.some(
    (t) => !t.isRecurringPaused && t.dueInSalaryMonth && !t.hasInstanceInSalaryMonth
  )
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
      label: 'Fällig – oben „Ausstehende erstellen“',
      className: 'bg-accent-subtle text-accent',
    }
  }
  return {
    label: 'Aktuell nicht fällig',
    className: 'bg-surface-muted text-secondary',
  }
}
