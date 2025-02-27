export interface Transaction {
  id: string
  userId: string
  description?: string | null
  merchant: string
  merchantId?: string | null
  merchantRef?: {
    id: string
    name: string
    description?: string | null
    category?: string | null
  } | null
  amount: number
  date: string
  isConfirmed: boolean
  isRecurring: boolean
  recurringInterval?: string | null
  lastConfirmedDate?: string | null
  version: number
  parentTransactionId?: string | null
  createdAt: string
}

export interface CreateTransactionData {
  merchant: string
  merchantId?: string
  description?: string
  amount: number
  date: string
  isRecurring?: boolean
  recurringInterval?: string
  lastConfirmedDate?: string
  parentTransactionId?: string
}

export interface User {
  id: string
  email: string
  salaryDay: number
  createdAt: Date
} 