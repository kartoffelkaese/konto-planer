/** Wann wiederkehrende Zahlungen eingetragen werden – auch im Browser nutzbar (ohne Prisma) */
export const RECURRING_AUTO_MODES = ['SALARY_MONTH', 'ON_DUE_DATE', 'OFF'] as const
export type RecurringAutoModeId = (typeof RECURRING_AUTO_MODES)[number]

export const RECURRING_AUTO_MODE_OPTIONS: { value: RecurringAutoModeId; label: string; description: string }[] = [
  {
    value: 'SALARY_MONTH',
    label: 'Zu Beginn des Gehaltsmonats',
    description: 'Alle Termine des Gehaltsmonats erscheinen gleich als ausstehende Buchungen.',
  },
  {
    value: 'ON_DUE_DATE',
    label: 'Am Buchungstag',
    description: 'Jede Zahlung erscheint an ihrem Termin. Verpasste Tage werden beim nächsten Öffnen nachgetragen.',
  },
  {
    value: 'OFF',
    label: 'Von Hand',
    description: 'Nichts wird automatisch eingetragen – einzelne Zahlungen legst du unter „Wiederkehrend“ an.',
  },
]

export function isRecurringAutoMode(value: unknown): value is RecurringAutoModeId {
  return RECURRING_AUTO_MODES.includes(value as RecurringAutoModeId)
}
