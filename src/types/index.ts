export interface Category {
  id: string
  name: string
  color: string
  createdAt: string
}

export interface Merchant {
  id: string
  name: string
  categoryId?: string | null
  category?: Category | null
  createdAt: string
}

export interface Transaction {
  id: string
  userId: string
  merchant: string
  merchantId?: string | null
  merchantRef?: Merchant | null
  description: string
  amount: number
  date: string
  isConfirmed: boolean
  isRecurring: boolean
  recurringInterval?: string | null
  lastConfirmedDate?: string | null
  version?: number
  parentTransactionId?: string | null
  childTransactions?: Transaction[]
  createdAt: string
}

export interface CreateTransactionData {
  merchant: string
  merchantId?: string
  description?: string
  amount: number
  date: string
  isConfirmed?: boolean
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