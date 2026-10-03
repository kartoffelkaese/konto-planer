import type { UserSettings } from '@/hooks/useUserSettings'
import { apiFetch } from './client'

export const getUserSettings = () => apiFetch<UserSettings>('/users/settings')

export const updateUserSettings = <T = UserSettings>(data: Record<string, unknown>) =>
  apiFetch<T>('/users/settings', { method: 'PATCH', body: JSON.stringify(data) })

/** Sendet eine Bestätigungs-E-Mail – ohne Zeitlimit (SMTP). */
export const requestEmailChange = (newEmail: string, password: string) =>
  apiFetch<{ pendingEmail?: string | null }>('/users/email', {
    method: 'PATCH',
    body: JSON.stringify({ newEmail, password }),
    timeoutMs: null,
  })

export const changePassword = (currentPassword: string, newPassword: string) =>
  apiFetch<{ message: string }>('/users/password', {
    method: 'PATCH',
    body: JSON.stringify({ currentPassword, newPassword }),
  })

export const cancelPendingEmailChange = () =>
  apiFetch<unknown>('/users/email/pending', { method: 'DELETE' })

export const resendEmailChange = () =>
  apiFetch<unknown>('/users/email/resend', { method: 'POST', timeoutMs: null })

export const deleteUserLogin = (password: string) =>
  apiFetch<unknown>('/users/delete', {
    method: 'DELETE',
    body: JSON.stringify({ password }),
    timeoutMs: null,
  })
