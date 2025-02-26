export interface Transaction {
  id: string
  description: string
  merchant: string
  amount: number
  date: string
  isConfirmed: boolean
  isRecurring: boolean
  recurringInterval?: string
  lastConfirmedDate?: string | null
  version: number
  parentTransactionId?: string | null
  createdAt: string
}

export interface User {
  id: string
  email: string
  salaryDay: number
  createdAt: Date
} 