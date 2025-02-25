export interface Transaction {
  id: string
  description: string
  amount: number
  date: Date
  isConfirmed: boolean
  isRecurring: boolean
  recurringInterval?: 'monthly' | 'quarterly' | 'yearly'
  lastConfirmedDate?: Date
  createdAt: Date
} 