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

/** Wählt das eigene Konto, das auf dem Level „Start“ beschreibbar bleibt */
export const setKeptAccount = (accountId: string) =>
  apiFetch<{ keptAccountId: string }>('/users/kept-account', {
    method: 'PATCH',
    body: JSON.stringify({ accountId }),
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

// --- Abo über Stripe ----------------------------------------------------------

/** Startet den Kauf von „Komplett“ und liefert die Adresse der Bezahlseite */
export const startCheckout = (interval: 'MONTHLY' | 'YEARLY') =>
  apiFetch<{ url: string }>('/billing/checkout', {
    method: 'POST',
    body: JSON.stringify({ interval }),
    timeoutMs: 30000,
  })

/** Adresse des Kundenportals (Zahlungsmittel, Rechnungen, kündigen) */
export const openBillingPortal = () =>
  apiFetch<{ url: string }>('/billing/portal', { method: 'POST', timeoutMs: 30000 })

/** Gleicht das eigene Abo sofort mit Stripe ab */
export const syncBilling = () =>
  apiFetch<{ synced: boolean }>('/billing/sync', { method: 'POST', timeoutMs: 30000 })

/** Kündigt das eigene Abo zum Ende des bezahlten Zeitraums */
export const cancelSubscription = () =>
  apiFetch<{ endsAt: string }>('/billing/cancel', { method: 'POST', timeoutMs: 30000 })

/** Kündigung ohne Anmeldung – geht als Auftrag an den Betreiber */
export const requestCancellation = (email: string, note?: string) =>
  apiFetch<{ received: boolean }>('/billing/cancel-request', {
    method: 'POST',
    body: JSON.stringify({ email, note }),
    timeoutMs: null,
  })
