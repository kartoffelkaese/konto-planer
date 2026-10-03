import type { TransferTarget } from '@/lib/transfers'
import { apiFetch } from './client'

export const getAccounts = <T = unknown[]>() => apiFetch<T>('/accounts')

export const createAccount = (data: {
  name: string
  bankId?: string
  isSimpleAccount?: boolean
}) =>
  apiFetch<{ id: string }>('/accounts', { method: 'POST', body: JSON.stringify(data) })

export const deleteAccount = (accountId: string) =>
  apiFetch<{ nextAccountId?: string | null }>(
    `/accounts/${encodeURIComponent(accountId)}`,
    { method: 'DELETE', timeoutMs: null }
  )

export const setActiveAccount = (accountId: string) =>
  apiFetch<unknown>('/accounts/active', {
    method: 'PATCH',
    body: JSON.stringify({ accountId }),
  })

export const getTransferTargets = () =>
  apiFetch<TransferTarget[]>('/accounts/transfer-targets')

export const getAccountMembers = <T>(accountId: string) =>
  apiFetch<T>(`/accounts/${encodeURIComponent(accountId)}/members`)

/** Einladung per E-Mail – ohne Zeitlimit (SMTP). */
export const inviteAccountMember = (accountId: string, email: string, role: string) =>
  apiFetch<{ message: string }>(`/accounts/${encodeURIComponent(accountId)}/members`, {
    method: 'POST',
    body: JSON.stringify({ email, role }),
    timeoutMs: null,
  })

export const updateAccountMemberRole = (accountId: string, memberId: string, role: string) =>
  apiFetch<unknown>(`/accounts/${encodeURIComponent(accountId)}/members`, {
    method: 'PATCH',
    body: JSON.stringify({ memberId, role }),
  })

export const removeAccountMember = (
  accountId: string,
  target: { memberId: string } | { inviteId: string }
) =>
  apiFetch<unknown>(`/accounts/${encodeURIComponent(accountId)}/members`, {
    method: 'DELETE',
    body: JSON.stringify(target),
  })

export const getReceivedInvites = <T = unknown[]>() => apiFetch<T>('/invites/received')

export const respondToInvite = <T>(inviteId: string, action: 'accept' | 'decline') =>
  apiFetch<T>(`/invites/${encodeURIComponent(inviteId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ action }),
  })

export const getNavBadges = <T>() => apiFetch<T>('/nav-badges')
