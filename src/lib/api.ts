import axios from 'axios'
import { Transaction } from '@/types'

interface TransactionsResponse {
  transactions: Transaction[]
  total: number
  hasMore: boolean
}

const api = axios.create({
  baseURL: '/api'
})

export const getTransactions = async (): Promise<TransactionsResponse> => {
  const response = await api.get('/transactions')
  return response.data
}

export const getTransaction = async (id: string): Promise<Transaction> => {
  const response = await api.get(`/transactions/${id}`)
  return response.data
}

export const createTransaction = async (data: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> => {
  const response = await api.post('/transactions', data)
  return response.data
}

export const updateTransaction = async (id: string, data: Partial<Transaction>): Promise<Transaction> => {
  const response = await api.patch(`/transactions/${id}`, data)
  return response.data
}

export const deleteTransaction = async (id: string): Promise<void> => {
  await api.delete(`/transactions/${id}`)
}

export const createRecurringInstance = async (transactionId: string): Promise<Transaction> => {
  const response = await api.post(`/transactions/${transactionId}/create-instance`)
  return response.data
}

export const createPendingInstances = async (): Promise<Transaction[]> => {
  const response = await api.post('/transactions/create-pending')
  return response.data
} 