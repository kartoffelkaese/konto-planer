import { apiFetch, encodeQuery } from './client'

export const getDashboard = <T>() => apiFetch<T>('/dashboard')

export const getStatistics = <T>(params: Record<string, string | undefined>) =>
  apiFetch<T>(`/statistics${encodeQuery(params)}`)

/** Backups können groß sein – ohne Zeitlimit. */
export const exportBackup = () => apiFetch<unknown>('/backup', { timeoutMs: null })

export const restoreBackup = (backup: unknown) =>
  apiFetch<unknown>('/backup', {
    method: 'POST',
    body: JSON.stringify(backup),
    timeoutMs: null,
  })
