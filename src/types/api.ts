export type TransactionType = 'income' | 'expense'
export type RecurringInterval = 'monthly' | 'yearly'

export interface Transaction {
  id: string
  amount: number
  description: string
  date: string // ISO 8601
  type: TransactionType
  category: string
  isRecurring: boolean
  recurringInterval: RecurringInterval | null
}

export interface RecurringTransaction {
  id: string
  amount: number
  description: string
  nextDate: string // ISO 8601
  type: TransactionType
  category: string
  recurringInterval: RecurringInterval
}

export interface Category {
  id: string
  name: string
  type: TransactionType
}

export interface MonthlyStatistics {
  totalIncome: number
  totalExpenses: number
  balance: number
  categoryBreakdown: Record<string, number>
}

// API Request Types
export interface CreateTransactionRequest {
  amount: number
  description: string
  date: string
  type: TransactionType
  category: string
  isRecurring: boolean
  recurringInterval: RecurringInterval | null
}

export interface UpdateTransactionRequest extends CreateTransactionRequest {
  id: string
}

export interface ConfirmRecurringTransactionRequest {
  confirmedDate: string
}

export interface CreateCategoryRequest {
  name: string
  type: TransactionType
}

// API Response Types
export interface TransactionsResponse {
  transactions: Transaction[]
}

export interface RecurringTransactionsResponse {
  transactions: RecurringTransaction[]
}

export interface CategoriesResponse {
  categories: Category[]
}

// API Error Response
export interface ApiError {
  code: number
  message: string
  details?: Record<string, any>
} 