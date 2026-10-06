import type { PlanId } from '@/lib/plans'
import type { AdminPlanChange, AdminUsersResponse } from '@/types/admin'
import { apiFetch, encodeQuery } from './client'

export const getAdminUsers = (params: { q?: string; page?: number }) =>
  apiFetch<AdminUsersResponse>(`/admin/users${encodeQuery(params)}`)

export const getAdminPlanChanges = (userId: string) =>
  apiFetch<AdminPlanChange[]>(`/admin/users/${encodeURIComponent(userId)}/plan`)

/** Löscht den Nutzer samt eigener Daten – ohne Zeitlimit, da viele Datensätze betroffen sein können */
export const deleteAdminUser = (userId: string, confirmEmail: string) =>
  apiFetch<{ message: string }>(`/admin/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    body: JSON.stringify({ confirmEmail }),
    timeoutMs: null,
  })

export const setAdminUserPlan = (
  userId: string,
  data: { plan: PlanId; expiresAt?: string | null; note?: string }
) =>
  apiFetch<{ id: string }>(`/admin/users/${encodeURIComponent(userId)}/plan`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
