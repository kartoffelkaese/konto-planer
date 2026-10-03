/** HTTP-Kern des API-Clients: same-origin, JSON, Zeitlimit, einheitliche Fehler. */

const API_BASE = '/api'
const TIMEOUT_MS = 10000

/** Fehlerantwort der API – `message` wie bisher (Server-Meldung oder `HTTP <status>`). */
export class ApiError extends Error {
  readonly status: number
  readonly data: unknown
  /** `error`-Text aus der Antwort, falls vorhanden */
  readonly serverMessage: string | null

  constructor(status: number, data: unknown, serverMessage: string | null) {
    super(serverMessage ?? `HTTP ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.data = data
    this.serverMessage = serverMessage
  }
}

/** Server-Meldung (`{ error }`) oder fester Ersatztext – entspricht `data.error || 'Text'`. */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError && err.serverMessage ? err.serverMessage : fallback
}

type ApiFetchInit = RequestInit & {
  /** Zeitlimit in ms; `null` = kein Limit (z. B. Mailversand, Backup). Standard 10 s. */
  timeoutMs?: number | null
}

export async function apiFetch<T>(path: string, init: ApiFetchInit = {}): Promise<T> {
  const { timeoutMs = TIMEOUT_MS, ...fetchInit } = init
  const controller = new AbortController()
  const timeoutId =
    timeoutMs === null ? null : setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...fetchInit,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...fetchInit.headers
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
      const serverMessage =
        typeof data === 'object' &&
        data !== null &&
        'error' in data &&
        typeof (data as { error: unknown }).error === 'string'
          ? (data as { error: string }).error
          : null
      throw new ApiError(response.status, data, serverMessage)
    }

    return data as T
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error('API Error: timeout')
      throw new Error('Die Anfrage hat zu lange gedauert. Bitte versuche es erneut.')
    }
    throw err
  } finally {
    if (timeoutId !== null) clearTimeout(timeoutId)
  }
}

export function encodeQuery(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      search.set(key, String(value))
    }
  }
  const q = search.toString()
  return q ? `?${q}` : ''
}

/** Wandelt API-Fehler in `Error(serverMeldung || fallback)` um – wie `data.error || 'Text'`. */
export async function withApiErrorFallback<T>(promise: Promise<T>, fallback: string): Promise<T> {
  try {
    return await promise
  } catch (err) {
    throw new Error(getApiErrorMessage(err, fallback))
  }
}
