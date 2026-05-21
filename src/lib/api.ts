import { Transaction, CreateTransactionData } from '@/types'
import type { RecurringWithStatus } from '@/lib/recurringStatus'
import { toISOString } from '@/lib/dateUtils'

interface TransactionsResponse {
  transactions: Transaction[]
  total: number
  hasMore: boolean
}

const API_BASE = '/api'
const TIMEOUT_MS = 10000

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...init.headers
      }
    })

    const text = await response.text()
    let data: unknown = null
    if (text) {
      try {
        data = JSON.parse(text) as unknown
      } catch {
        data = text
      }
    }

    if (!response.ok) {
      console.error('API Error:', response.status, data)
      const errMsg =
        typeof data === 'object' &&
        data !== null &&
        'error' in data &&
        typeof (data as { error: unknown }).error === 'string'
          ? (data as { error: string }).error
          : `HTTP ${response.status}`
      throw new Error(errMsg)
    }

    return data as T
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error('API Error: timeout')
      throw new Error('Die Anfrage hat zu lange gedauert. Bitte versuchen Sie es erneut.')
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}

function encodeQuery(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      search.set(key, String(value))
    }
  }
  const q = search.toString()
  return q ? `?${q}` : ''
}

export const getTransactions = async (
  page: number = 1,
  limit: number = 20,
  options?: {
    salaryDay?: number | null
    filterSalaryMonth?: boolean
    search?: string
  }
): Promise<TransactionsResponse> => {
  const params: Record<string, string | number | boolean | undefined> = { page, limit }
  if (options?.salaryDay !== undefined && options.salaryDay !== null) {
    params.salaryDay = options.salaryDay
  }
  if (options?.filterSalaryMonth !== undefined) {
    params.filterSalaryMonth = options.filterSalaryMonth
  }
  if (options?.search?.trim()) {
    params.q = options.search.trim()
  }
  return apiFetch<TransactionsResponse>(`/transactions${encodeQuery(params)}`)
}

export const getTransaction = async (id: string): Promise<Transaction> => {
  return apiFetch<Transaction>(`/transactions/${encodeURIComponent(id)}`)
}

export const createTransaction = async (data: CreateTransactionData): Promise<Transaction> => {
  if (!data.merchant || !data.amount || !data.date) {
    throw new Error('Merchant, amount und date sind erforderlich')
  }

  const formattedData = {
    ...data,
    amount: typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount,
    date: toISOString(data.date),
    lastConfirmedDate: data.lastConfirmedDate ? toISOString(data.lastConfirmedDate) : null,
    isConfirmed: data.isConfirmed ?? false,
    isRecurring: data.isRecurring ?? false,
    description: data.description || null
  }

  return apiFetch<Transaction>('/transactions', {
    method: 'POST',
    body: JSON.stringify(formattedData)
  })
}

export const updateTransaction = async (
  id: string,
  data: Partial<Transaction>
): Promise<Transaction> => {
  const formattedData = {
    ...data,
    amount:
      data.amount !== undefined
        ? typeof data.amount === 'string'
          ? parseFloat(data.amount)
          : data.amount
        : undefined,
    date: data.date ? toISOString(data.date) : undefined,
    lastConfirmedDate: data.lastConfirmedDate ? toISOString(data.lastConfirmedDate) : null
  }

  return apiFetch<Transaction>(`/transactions/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(formattedData)
  })
}

export const deleteTransaction = async (id: string): Promise<void> => {
  await apiFetch<unknown>(`/transactions/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export const createRecurringInstance = async (transactionId: string): Promise<Transaction> => {
  try {
    return await apiFetch<Transaction>(
      `/transactions/${encodeURIComponent(transactionId)}/create-instance`,
      { method: 'POST' }
    )
  } catch (error) {
    console.error('Fehler in createRecurringInstance:', error)
    throw error
  }
}

export const createPendingInstances = async (): Promise<Transaction[]> => {
  return apiFetch<Transaction[]>('/transactions/create-pending', { method: 'POST' })
}

export const getRecurringTransactions = async (): Promise<RecurringWithStatus[]> => {
  return apiFetch<RecurringWithStatus[]>('/transactions/recurring')
}
