import { apiFetch, encodeQuery } from './client'

export const getDashboard = <T>() => apiFetch<T>('/dashboard')

export const getStatistics = <T>(params: Record<string, string | undefined>) =>
  apiFetch<T>(`/statistics${encodeQuery(params)}`)

/** Backups können groß sein – ohne Zeitlimit. */
/** Backup des aktiven Kontos oder – mit `accountId` – eines anderen eigenen Kontos */
export const exportBackup = (accountId?: string) =>
  apiFetch<unknown>(accountId ? `/backup?accountId=${encodeURIComponent(accountId)}` : '/backup', {
    timeoutMs: null,
  })

export const restoreBackup = (backup: unknown) =>
  apiFetch<unknown>('/backup', {
    method: 'POST',
    body: JSON.stringify(backup),
    timeoutMs: null,
  })
