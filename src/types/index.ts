export interface Transaction {
  id: string
  description: string
  amount: number
  date: Date
  isConfirmed: boolean
  isRecurring: boolean
  recurringInterval?: string
  lastConfirmedDate?: Date | null
  createdAt: Date
}

export interface User {
  id: string
  email: string
  salaryDay: number
  createdAt: Date
} 