import { Transaction, CreateTransactionData } from '@/types'
import type { RecurringWithStatus } from '@/lib/recurringStatus'
import { toISOString } from '@/lib/dateUtils'
import type {
  CreateSplitExpenseData,
  CreateSplitListData,
  SplitBalancesResponse,
  SplitCategory,
  SplitExpense,
  SplitExpenseGuest,
  SplitHistoryResponse,
  SplitHistoryGuestResponse,
  SplitInviteReceived,
  SplitListDetail,
  SplitListGuestDetail,
  SplitListSummary,
  SplitParticipant,
  SplitSettlement,
  SplitShareStatus,
} from '@/types/split'

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

export const getRecurringTransactions = async (): Promise<RecurringWithStatus[]> => {
  return apiFetch<RecurringWithStatus[]>('/transactions/recurring')
}

export const setRecurringPaused = async (
  id: string,
  paused: boolean
): Promise<Transaction> => {
  return updateTransaction(id, { isRecurringPaused: paused })
}

export type CsvImportPreviewMerchant = {
  id: string
  name: string
  categoryIds?: string[]
  categories?: Array<{ id: string; name: string; color: string }>
}

export type CsvImportPreviewRow = {
  rowIndex: number
  date: string | null
  amount: number | null
  description: string
  merchantRaw: string
  merchantId: string | null
  merchantName: string | null
  matchConfidence: 'exact' | 'contains' | 'similar' | null
  categoryId: string | null
  isConfirmed: boolean
  isDuplicate: boolean
  duplicateTransactionId: string | null
  canConfirmDuplicate: boolean
  isRecurringMatch: boolean
  recurringMatchKind: 'confirmExisting' | 'createAndConfirm' | 'alreadyBooked' | 'none'
  recurringTemplateId: string | null
  recurringInstanceId: string | null
  canConfirmRecurring: boolean
  errors: string[]
  suggestedIncluded: boolean
  suggestedConfirm: boolean
  suggestedConfirmRecurring: boolean
}

export type CsvImportPreviewResponse = {
  formatId: string
  formatLabel: string
  bankId: string | null
  bankName: string | null
  headerMismatch?: boolean
  availableFormats: Array<{ id: string; label: string }>
  rows: CsvImportPreviewRow[]
  merchants: CsvImportPreviewMerchant[]
  summary: {
    total: number
    duplicates: number
    recurring: number
    errors: number
    suggested: number
    confirmable: number
    dateRange: { start: string; end: string } | null
  }
}

export type CsvImportPreviewOptions = {
  csvText: string
  formatId?: string
}

export type CsvImportCommitRow = {
  rowIndex: number
  confirmExistingId?: string
  confirmRecurringTemplateId?: string
  date?: string
  amount?: number
  description?: string | null
  merchantId?: string | null
  merchant?: string | null
  createNewMerchant?: boolean
  categoryId?: string | null
  isConfirmed?: boolean
}

export const previewCsvImport = async (
  csvText: string,
  options?: { formatId?: string }
): Promise<CsvImportPreviewResponse> => {
  return apiFetch<CsvImportPreviewResponse>('/transactions/import/preview', {
    method: 'POST',
    body: JSON.stringify({
      csvText,
      ...(options?.formatId ? { formatId: options.formatId } : {}),
    }),
  })
}

export const commitCsvImport = async (
  rows: CsvImportCommitRow[]
): Promise<{
  created: number
  confirmed: number
  skipped: number
  errors: Array<{ rowIndex: number; message: string }>
}> => {
  return apiFetch('/transactions/import', {
    method: 'POST',
    body: JSON.stringify({ rows }),
  })
}

// --- Split-Budget ---

export const getSplitLists = () => apiFetch<SplitListSummary[]>('/split/lists')

export const createSplitList = (data: CreateSplitListData) =>
  apiFetch<SplitListSummary>('/split/lists', {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const getSplitList = (id: string) =>
  apiFetch<SplitListDetail>(`/split/lists/${id}`)

export const updateSplitList = (
  id: string,
  data: {
    name?: string
    description?: string | null
    status?: 'ACTIVE' | 'ARCHIVED'
  }
) =>
  apiFetch<SplitListDetail>(`/split/lists/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

export const deleteSplitList = (id: string) =>
  apiFetch<{ message: string }>(`/split/lists/${id}`, { method: 'DELETE' })

export const getSplitParticipants = (listId: string) =>
  apiFetch<SplitParticipant[]>(`/split/lists/${listId}/participants`)

export const addSplitParticipant = (
  listId: string,
  data: { displayName: string; email?: string }
) =>
  apiFetch<SplitParticipant>(`/split/lists/${listId}/participants`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const removeSplitParticipant = (listId: string, participantId: string) =>
  apiFetch<{ message: string }>(`/split/lists/${listId}/participants`, {
    method: 'DELETE',
    body: JSON.stringify({ participantId }),
  })

export const getSplitCategories = (listId: string) =>
  apiFetch<SplitCategory[]>(`/split/lists/${listId}/categories`)

export const createSplitCategory = (
  listId: string,
  data: { name: string; color?: string | null }
) =>
  apiFetch<SplitCategory>(`/split/lists/${listId}/categories`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const updateSplitCategory = (
  listId: string,
  data: { categoryId: string; name?: string; color?: string | null }
) =>
  apiFetch<SplitCategory>(`/split/lists/${listId}/categories`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

export const deleteSplitCategory = (
  listId: string,
  data: { categoryId: string; reassignToCategoryId?: string | null }
) =>
  apiFetch<{ message: string }>(`/split/lists/${listId}/categories`, {
    method: 'DELETE',
    body: JSON.stringify(data),
  })

export const getSplitExpenses = (listId: string) =>
  apiFetch<SplitExpense[]>(`/split/lists/${listId}/expenses`)

export const createSplitExpense = (listId: string, data: CreateSplitExpenseData) =>
  apiFetch<SplitExpense>(`/split/lists/${listId}/expenses`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const updateSplitExpense = (
  listId: string,
  data: CreateSplitExpenseData & { expenseId: string }
) =>
  apiFetch<SplitExpense>(`/split/lists/${listId}/expenses`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

export const deleteSplitExpense = (listId: string, expenseId: string) =>
  apiFetch<{ message: string }>(`/split/lists/${listId}/expenses`, {
    method: 'DELETE',
    body: JSON.stringify({ expenseId }),
  })

export const getSplitBalances = (listId: string) =>
  apiFetch<SplitBalancesResponse>(`/split/lists/${listId}/balances`)

export const createSplitSettlement = (
  listId: string,
  data: {
    fromParticipantId: string
    toParticipantId: string
    amount: number
    note?: string
  }
) =>
  apiFetch<SplitSettlement>(`/split/lists/${listId}/settlements`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const getSplitHistory = (listId: string) =>
  apiFetch<SplitHistoryResponse>(`/split/lists/${listId}/history`)

export const getSplitInvitesReceived = () =>
  apiFetch<SplitInviteReceived[]>('/split/invites/received')

export const respondToSplitInvite = (id: string, action: 'accept' | 'decline') =>
  apiFetch<{ message: string; splitListId?: string; splitListName?: string }>(
    `/split/invites/${id}`,
    { method: 'PATCH', body: JSON.stringify({ action }) }
  )

export const getSplitShareStatus = (listId: string) =>
  apiFetch<SplitShareStatus>(`/split/lists/${listId}/share`)

export const updateSplitShare = (listId: string, shareEnabled: boolean) =>
  apiFetch<SplitShareStatus>(`/split/lists/${listId}/share`, {
    method: 'PATCH',
    body: JSON.stringify({ shareEnabled }),
  })

export const regenerateSplitShare = (listId: string) =>
  apiFetch<SplitShareStatus>(`/split/lists/${listId}/share`, {
    method: 'POST',
  })

export const getPublicSplitList = (token: string) =>
  apiFetch<SplitListGuestDetail>(`/split/public/${encodeURIComponent(token)}`)

export const getPublicSplitExpenses = (token: string) =>
  apiFetch<SplitExpenseGuest[]>(`/split/public/${encodeURIComponent(token)}/expenses`)

export const getPublicSplitBalances = (token: string) =>
  apiFetch<SplitBalancesResponse>(
    `/split/public/${encodeURIComponent(token)}/balances`
  )

export const getPublicSplitHistory = (token: string) =>
  apiFetch<SplitHistoryGuestResponse>(
    `/split/public/${encodeURIComponent(token)}/history`
  )
