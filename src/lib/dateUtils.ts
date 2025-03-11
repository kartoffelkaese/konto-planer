import { Transaction } from '@/types'
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

/**
 * Berechnet das nächste Fälligkeitsdatum
 */
export function getNextDueDate(lastConfirmedDate: Date | string, interval: string): Date {
  const date = dayjs(lastConfirmedDate).tz(DEFAULT_TIMEZONE)
  
  switch (interval) {
    case 'monthly':
      return date.add(1, 'month').toDate()
    case 'quarterly':
      return date.add(3, 'month').toDate()
    case 'yearly':
      return date.add(1, 'year').toDate()
    default:
      return date.toDate()
  }
}

/**
 * Berechnet den Gehaltsmonatszeitraum
 */
export function getSalaryMonthRange(salaryDay: number) {
  const now = dayjs().tz(DEFAULT_TIMEZONE)
  const currentDay = now.date()
  
  let startDate: dayjs.Dayjs
  if (currentDay >= salaryDay) {
    startDate = now.date(salaryDay)
  } else {
    startDate = now.subtract(1, 'month').date(salaryDay)
  }
  
  const endDate = startDate.add(1, 'month').subtract(1, 'day')
  
  return {
    startDate: startDate.toDate(),
    endDate: endDate.toDate()
  }
}

/**
 * Prüft ob eine Transaktion im aktuellen Gehaltsmonat fällig ist
 */
export function isTransactionDueInSalaryMonth(
  transaction: {
    date: Date | string
    isRecurring: boolean
    recurringInterval?: string | null
    lastConfirmedDate?: Date | string | null
  },
  salaryDay: number
): boolean {
  if (!transaction.isRecurring) return false
  if (!transaction.lastConfirmedDate || !transaction.recurringInterval) return true

  const { startDate, endDate } = getSalaryMonthRange(salaryDay)
  const nextDueDate = getNextDueDate(
    transaction.lastConfirmedDate,
    transaction.recurringInterval
  )

  return dayjs(nextDueDate).isBetween(startDate, endDate, 'day', '[]')
}

/**
 * Prüft ob eine Transaktion ausstehend ist
 */
export function isTransactionPending(transaction: Transaction): boolean {
  return transaction.isRecurring && 
         isTransactionDueInSalaryMonth(transaction, 23) && // TODO: salaryDay aus den Einstellungen laden
         !transaction.isConfirmed
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