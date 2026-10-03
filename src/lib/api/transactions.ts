import { Transaction, CreateTransactionData } from '@/types'
import type { RecurringWithStatus } from '@/lib/recurringStatus'
import { toISOString } from '@/lib/dateUtils'
import type { PendingUndoItem, PendingUndoMode, PendingUndoResult } from '@/lib/pendingUndo'
import { apiFetch, encodeQuery } from './client'

interface TransactionsResponse {
  transactions: Transaction[]
  total: number
  hasMore: boolean
}

export interface TransactionTotalsResponse {
  currentIncome: number
  currentExpenses: number
  totalIncome: number
  totalExpenses: number
  clearedBalance: number
  totalPendingExpenses: number
  available: number
  periodLabel?: string
}

export type TransactionPeriodQuery = {
  period?: string
  startDate?: string
  endDate?: string
  salaryDay?: number | null
  search?: string
}

function buildTransactionQueryParams(
  options?: TransactionPeriodQuery
): Record<string, string | number | boolean | undefined> {
  const params: Record<string, string | number | boolean | undefined> = {}
  if (options?.salaryDay !== undefined && options.salaryDay !== null) {
    params.salaryDay = options.salaryDay
  }
  if (options?.period && options.period !== 'all') {
    params.period = options.period
  }
  if (options?.startDate) {
    params.startDate = options.startDate
  }
  if (options?.endDate) {
    params.endDate = options.endDate
  }
  if (options?.search?.trim()) {
    params.q = options.search.trim()
  }
  return params
}

export const getTransactions = async (
  page: number = 1,
  limit: number = 20,
  options?: TransactionPeriodQuery
): Promise<TransactionsResponse> => {
  const params: Record<string, string | number | boolean | undefined> = {
    page,
    limit,
    ...buildTransactionQueryParams(options),
  }
  return apiFetch<TransactionsResponse>(`/transactions${encodeQuery(params)}`)
}

export const getTransactionTotals = async (
  options?: TransactionPeriodQuery
): Promise<TransactionTotalsResponse> => {
  return apiFetch<TransactionTotalsResponse>(
    `/transactions/totals${encodeQuery(buildTransactionQueryParams(options))}`
  )
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
  const formattedData: Record<string, unknown> = {
    ...data,
    amount:
      data.amount !== undefined
        ? typeof data.amount === 'string'
          ? parseFloat(data.amount)
          : data.amount
        : undefined,
    date: data.date ? toISOString(data.date) : undefined,
  }
  if (data.lastConfirmedDate !== undefined) {
    formattedData.lastConfirmedDate = data.lastConfirmedDate
      ? toISOString(data.lastConfirmedDate)
      : null
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

export const undoPendingInstances = async (
  items: PendingUndoItem[],
  mode: PendingUndoMode
): Promise<PendingUndoResult> => {
  return apiFetch<PendingUndoResult>('/transactions/create-pending/undo', {
    method: 'POST',
    body: JSON.stringify({ items, mode }),
  })
}

export const getRecurringTransactions = async (): Promise<RecurringWithStatus[]> => {
  return apiFetch<RecurringWithStatus[]>('/transactions/recurring')
}

export const setRecurringPaused = async (
  id: string,
  paused: boolean
): Promise<Transaction> => {
  return updateTransaction(id, { isRecurringPaused: paused })
}
