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
  accountId: string
  merchant: string
  merchantId?: string | null
  merchantRef?: Merchant | null
  description: string | null
  amount: number
  date: string
  isConfirmed: boolean
  isRecurring: boolean
  isRecurringPaused?: boolean
  recurringInterval?: string | null
  lastConfirmedDate?: string | null
  version?: number
  parentTransactionId?: string | null
  childTransactions?: Transaction[]
  isTransfer?: boolean
  transferTargetAccountId?: string | null
  transferTargetAccount?: {
    id: string
    name: string
  } | null
  transferTargetMerchant?: string | null
  transferPairAsSource?: {
    id: string
    targetTransactionId: string | null
  } | null
  transferPairAsTarget?: {
    id: string
    sourceTransaction?: {
      account: {
        id: string
        name: string
      }
    } | null
  } | null
  createdAt: string
}

export interface CreateTransactionData {
  merchant: string
  merchantId?: string
  createNewMerchant?: boolean
  isTransfer?: boolean
  transferTargetAccountId?: string
  description?: string
  amount: number
  date: string
  isConfirmed?: boolean
  isRecurring?: boolean
  isRecurringPaused?: boolean
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