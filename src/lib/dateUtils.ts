import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import isBetween from 'dayjs/plugin/isBetween'

// Plugins initialisieren
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(localizedFormat)
dayjs.extend(isBetween)

// Setze die Standard-Zeitzone auf 'Europe/Berlin'
const DEFAULT_TIMEZONE = 'Europe/Berlin'

/**
 * Konvertiert ein Datum in einen ISO-String mit der korrekten Zeitzone
 */
export function toISOString(date: Date | string): string {
  return dayjs(date).tz(DEFAULT_TIMEZONE).toISOString()
}

/**
 * Konvertiert ein Datum in ein dayjs-Objekt mit der korrekten Zeitzone
 */
export function toDate(date: Date | string): Date {
  return dayjs(date).tz(DEFAULT_TIMEZONE).toDate()
}

/**
 * Formatiert ein Datum für die Anzeige
 */
export function formatDate(date: Date | string): string {
  return dayjs(date).tz(DEFAULT_TIMEZONE).format('DD.MM.YYYY')
}

/**
 * Formatiert ein Datum für Input-Felder
 */
export function formatDateForInput(date: Date | string): string {
  return dayjs(date).tz(DEFAULT_TIMEZONE).format('YYYY-MM-DD')
}

export type RecurringInterval = 'monthly' | 'quarterly' | 'semiannual' | 'yearly' | string

function toBerlinDay(date: Date | string) {
  return dayjs(date).tz(DEFAULT_TIMEZONE).startOf('day')
}

/** Ein Intervall-Schritt ab einem Datum (Anker-Kette). */
export function addRecurringInterval(
  date: Date | string | dayjs.Dayjs,
  interval: RecurringInterval
): dayjs.Dayjs {
  const d = dayjs.isDayjs(date) ? date.tz(DEFAULT_TIMEZONE) : toBerlinDay(date)

  switch (interval) {
    case 'monthly':
      return d.add(1, 'month')
    case 'quarterly':
      return d.add(3, 'month')
    case 'semiannual':
      return d.add(6, 'month')
    case 'yearly':
      return d.add(1, 'year')
    default:
      return d
  }
}

const MAX_RECURRING_ITERATIONS = 500

/**
 * Nächster Anker-Termin (transaction.date) ab fromDate (inkl.), Standard: heute.
 */
export function getNextRecurringDueDate(
  anchor: Date | string,
  interval: RecurringInterval,
  fromDate?: Date | string
): Date {
  const from = fromDate ? toBerlinDay(fromDate) : toBerlinDay(getCurrentDate())
  let candidate = toBerlinDay(anchor)
  let iterations = 0

  while (candidate.isBefore(from, 'day') && iterations < MAX_RECURRING_ITERATIONS) {
    candidate = addRecurringInterval(candidate, interval)
    iterations++
  }

  return candidate.toDate()
}

/**
 * Nächster Anker-Termin strikt nach afterDate (exkl. Tag von afterDate).
 */
export function getNextRecurringDueDateAfter(
  anchor: Date | string,
  interval: RecurringInterval,
  afterDate: Date | string
): Date {
  const after = toBerlinDay(afterDate)
  let candidate = toBerlinDay(anchor)
  let iterations = 0

  while (
    (candidate.isBefore(after, 'day') || candidate.isSame(after, 'day')) &&
    iterations < MAX_RECURRING_ITERATIONS
  ) {
    candidate = addRecurringInterval(candidate, interval)
    iterations++
  }

  return candidate.toDate()
}

/**
 * Alle Anker-Fälligkeitstermine im geschlossenen Intervall [start, end] (Kalendertage, Europe/Berlin).
 */
export function getRecurringDueDatesInRange(
  anchor: Date | string,
  interval: RecurringInterval,
  start: Date | string,
  end: Date | string
): Date[] {
  const rangeStart = toBerlinDay(start)
  const rangeEnd = toBerlinDay(end)
  const results: Date[] = []

  let candidate = toBerlinDay(anchor)
  let iterations = 0

  while (candidate.isBefore(rangeStart, 'day') && iterations < MAX_RECURRING_ITERATIONS) {
    candidate = addRecurringInterval(candidate, interval)
    iterations++
  }

  iterations = 0
  while (
    (candidate.isBefore(rangeEnd, 'day') || candidate.isSame(rangeEnd, 'day')) &&
    iterations < MAX_RECURRING_ITERATIONS
  ) {
    results.push(candidate.toDate())
    candidate = addRecurringInterval(candidate, interval)
    iterations++
  }

  return results
}

/**
 * Berechnet den Gehaltsmonatszeitraum
 */
export function getSalaryMonthRange(salaryDay: number) {
  const now = dayjs().tz(DEFAULT_TIMEZONE)
  const currentDay = now.date()
  
  let startDate: dayjs.Dayjs
  let endDate: dayjs.Dayjs

  if (currentDay >= salaryDay) {
    // Wenn wir nach dem Gehaltstag sind, ist der aktuelle Monat der Gehaltsmonat
    // Der Gehaltsmonat beginnt am Gehaltstag des aktuellen Monats
    startDate = now.date(salaryDay).startOf('day')
    // Der Gehaltsmonat endet am Tag vor dem Gehaltstag des nächsten Monats
    endDate = now.add(1, 'month').date(salaryDay).subtract(1, 'day').endOf('day')
  } else {
    // Wenn wir vor dem Gehaltstag sind, ist der Vormonat der Gehaltsmonat
    // Der Gehaltsmonat beginnt am Gehaltstag des Vormonats
    startDate = now.subtract(1, 'month').date(salaryDay).startOf('day')
    // Der Gehaltsmonat endet am Tag vor dem Gehaltstag des aktuellen Monats
    endDate = now.date(salaryDay).subtract(1, 'day').endOf('day')
  }
  
  // Konvertiere die Daten in UTC für die Datenbank
  return {
    startDate: startDate.utc().toDate(),
    endDate: endDate.utc().toDate()
  }
}

/** Gehaltsmonat, der ein Referenzdatum enthält (für CSV-/Import-Zuordnung). */
export function getSalaryMonthRangeForDate(salaryDay: number, reference: Date | string) {
  const ref = dayjs(reference).tz(DEFAULT_TIMEZONE)
  const currentDay = ref.date()

  let startDate: dayjs.Dayjs
  let endDate: dayjs.Dayjs

  if (currentDay >= salaryDay) {
    startDate = ref.date(salaryDay).startOf('day')
    endDate = ref.add(1, 'month').date(salaryDay).subtract(1, 'day').endOf('day')
  } else {
    startDate = ref.subtract(1, 'month').date(salaryDay).startOf('day')
    endDate = ref.date(salaryDay).subtract(1, 'day').endOf('day')
  }

  return {
    startDate: startDate.utc().toDate(),
    endDate: endDate.utc().toDate(),
  }
}

/** Kalendermonat (1. bis letzter Tag) – für einfache Konten */
export function getCalendarMonthRange(reference = new Date()) {
  const ref = dayjs(reference).tz(DEFAULT_TIMEZONE)
  const startDate = ref.startOf('month').startOf('day')
  const endDate = ref.endOf('month').endOf('day')
  return {
    startDate: startDate.utc().toDate(),
    endDate: endDate.utc().toDate(),
  }
}

export function getCalendarMonthLabel(reference = new Date()) {
  return new Intl.DateTimeFormat('de-DE', {
    month: 'long',
    year: 'numeric',
  }).format(reference)
}

/** Lesbare Angabe des aktuellen Gehaltsmonats (für Dashboard & Co.) */
export function getSalaryMonthPeriodInfo(salaryDay: number) {
  const { startDate, endDate } = getSalaryMonthRange(salaryDay)
  return {
    startDate,
    endDate,
    rangeLabel: `${formatDate(startDate)} – ${formatDate(endDate)}`,
  }
}

/**
 * Prüft ob eine Transaktion im aktuellen Gehaltsmonat fällig ist
 */
export function isTransactionDueInSalaryMonth(
  transaction: {
    date: Date | string
    isRecurring: boolean
    isRecurringPaused?: boolean
    recurringInterval?: string | null
    lastConfirmedDate?: Date | string | null
  },
  salaryDay: number
): boolean {
  if (!transaction.isRecurring) return false
  if (transaction.isRecurringPaused) return false
  const interval = transaction.recurringInterval || 'monthly'
  if (!transaction.recurringInterval) return true

  const { startDate, endDate } = getSalaryMonthRange(salaryDay)
  const dueDates = getRecurringDueDatesInRange(
    transaction.date,
    interval,
    startDate,
    endDate
  )

  return dueDates.length > 0
}

/**
 * Prüft ob eine Transaktion ausstehend ist (Gehaltsmonat aus Einstellungen)
 */
export function isTransactionPending(
  transaction: Parameters<typeof isTransactionDueInSalaryMonth>[0] & {
    isConfirmed: boolean
  },
  salaryDay: number
): boolean {
  return (
    transaction.isRecurring &&
    isTransactionDueInSalaryMonth(transaction, salaryDay) &&
    !transaction.isConfirmed
  )
}

/**
 * Gibt das aktuelle Datum in der korrekten Zeitzone zurück
 */
export function getCurrentDate(): Date {
  return dayjs().tz(DEFAULT_TIMEZONE).toDate()
}

/**
 * Gibt das aktuelle Datum als ISO-String zurück
 */
export function getCurrentDateISO(): string {
  return dayjs().tz(DEFAULT_TIMEZONE).toISOString()
}

/**
 * Prüft ob ein Datum in der Vergangenheit liegt
 */
export function isInPast(date: Date | string): boolean {
  return dayjs(date).tz(DEFAULT_TIMEZONE).isBefore(getCurrentDate())
}

/**
 * Prüft ob ein Datum heute ist
 */
export function isToday(date: Date | string): boolean {
  return dayjs(date).tz(DEFAULT_TIMEZONE).isSame(getCurrentDate(), 'day')
} 