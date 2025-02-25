import { Transaction } from '@/types'

export function getSalaryMonthRange(salaryDay: number) {
  const today = new Date()
  const currentDay = today.getDate()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()

  let startDate: Date
  let endDate: Date

  if (currentDay >= salaryDay) {
    // Wir sind nach dem Gehaltseingangstag
    startDate = new Date(currentYear, currentMonth, salaryDay)
    endDate = new Date(currentYear, currentMonth + 1, salaryDay)
  } else {
    // Wir sind vor dem Gehaltseingangstag
    startDate = new Date(currentYear, currentMonth - 1, salaryDay)
    endDate = new Date(currentYear, currentMonth, salaryDay)
  }

  return { startDate, endDate }
}

export function getNextDueDate(lastConfirmedDate: Date, interval: string): Date {
  const date = new Date(lastConfirmedDate)
  
  switch (interval) {
    case 'monthly':
      date.setMonth(date.getMonth() + 1)
      break
    case 'quarterly':
      date.setMonth(date.getMonth() + 3)
      break
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1)
      break
  }

  return date
}

export function isTransactionDueInSalaryMonth(
  transaction: {
    date: Date
    isRecurring: boolean
    recurringInterval?: string
    lastConfirmedDate?: Date
  },
  salaryDay: number
): boolean {
  if (!transaction.isRecurring) return false
  if (!transaction.lastConfirmedDate || !transaction.recurringInterval) return true

  const { startDate, endDate } = getSalaryMonthRange(salaryDay)
  const nextDueDate = getNextDueDate(
    new Date(transaction.lastConfirmedDate),
    transaction.recurringInterval
  )

  return nextDueDate >= startDate && nextDueDate <= endDate
}

export function isTransactionPending(transaction: Transaction): boolean {
  return transaction.isRecurring && 
         isTransactionDueInSalaryMonth(transaction, 23) && // TODO: salaryDay aus den Einstellungen laden
         !transaction.isConfirmed
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(d)
} 