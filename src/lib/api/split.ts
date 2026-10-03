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
  SplitListCurrency,
  SplitListDetail,
  SplitListGuestDetail,
  SplitListSummary,
  SplitParticipant,
  SplitSettlement,
  SplitShareStatus,
} from '@/types/split'
import { apiFetch } from './client'

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

export const getSplitCurrencies = (listId: string) =>
  apiFetch<SplitListCurrency[]>(`/split/lists/${listId}/currencies`)

export const getSplitAvailableCurrencies = () =>
  apiFetch<Array<{ code: string; label: string }>>('/split/currencies')

export const addSplitCurrency = (listId: string, currencyCode: string) =>
  apiFetch<SplitListCurrency>(`/split/lists/${listId}/currencies`, {
    method: 'POST',
    body: JSON.stringify({ currencyCode }),
  })

export const removeSplitCurrency = (listId: string, currencyCode: string) =>
  apiFetch<{ message: string }>(`/split/lists/${listId}/currencies`, {
    method: 'DELETE',
    body: JSON.stringify({ currencyCode }),
  })

export const getSplitExchangeRate = (
  listId: string,
  params: { currency: string; date: string; amount?: number }
) => {
  const search = new URLSearchParams({
    currency: params.currency,
    date: params.date,
  })
  if (params.amount != null) {
    search.set('amount', String(params.amount))
  }
  return apiFetch<{
    currency: string
    rate: number
    rateDate: string
    eurAmount?: number
  }>(`/split/lists/${listId}/exchange-rate?${search.toString()}`)
}

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
    settledAt?: string
  }
) =>
  apiFetch<SplitSettlement>(`/split/lists/${listId}/settlements`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const deleteSplitSettlement = (listId: string, settlementId: string) =>
  apiFetch<{ message: string }>(`/split/lists/${listId}/settlements`, {
    method: 'DELETE',
    body: JSON.stringify({ settlementId }),
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
