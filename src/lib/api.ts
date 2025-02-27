import axios from 'axios'
import { Transaction } from '@/types'

interface TransactionsResponse {
  transactions: Transaction[]
  total: number
  hasMore: boolean
}

const api = axios.create({
  baseURL: '/api',
  timeout: 10000, // 10 Sekunden Timeout
  headers: {
    'Content-Type': 'application/json'
  }
})

// Füge einen Interceptor hinzu, um Fehler zu behandeln
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error)
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('Die Anfrage hat zu lange gedauert. Bitte versuchen Sie es erneut.'))
    }
    if (error.response?.data?.error) {
      return Promise.reject(new Error(error.response.data.error))
    }
    return Promise.reject(error)
  }
)

export const getTransactions = async (page: number = 1, limit: number = 20): Promise<TransactionsResponse> => {
  const response = await api.get('/transactions', {
    params: { page, limit }
  })
  return response.data
}

export const getTransaction = async (id: string): Promise<Transaction> => {
  const response = await api.get(`/transactions/${id}`)
  return response.data
}

type CreateTransactionData = Omit<Transaction, 'id' | 'createdAt' | 'version'> & {
  version?: number
}

export const createTransaction = async (data: CreateTransactionData): Promise<Transaction> => {
  // Stelle sicher, dass alle erforderlichen Felder vorhanden sind
  if (!data.merchant || !data.amount || !data.date) {
    throw new Error('Merchant, amount und date sind erforderlich')
  }

  // Formatiere die Daten für die API
  const formattedData = {
    ...data,
    amount: typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount,
    date: new Date(data.date).toISOString(),
    lastConfirmedDate: data.lastConfirmedDate ? new Date(data.lastConfirmedDate).toISOString() : null,
    isConfirmed: data.isConfirmed ?? false,
    isRecurring: data.isRecurring ?? false,
    description: data.description || null
  }

  const response = await api.post('/transactions', formattedData)
  return response.data
}

export const updateTransaction = async (id: string, data: Partial<Transaction>): Promise<Transaction> => {
  // Formatiere die Daten für die API
  const formattedData = {
    ...data,
    amount: data.amount !== undefined 
      ? (typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount)
      : undefined,
    date: data.date ? new Date(data.date).toISOString() : undefined,
    lastConfirmedDate: data.lastConfirmedDate ? new Date(data.lastConfirmedDate).toISOString() : null
  }

  const response = await api.patch(`/transactions/${id}`, formattedData)
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