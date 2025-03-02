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
  createdAt: string
  merchantRef?: {
    category?: {
      name: string
      color: string
    }
  }
  version?: number
  userId?: string
} 