/**
 * Zentraler API-Client für alle Aufrufe aus dem Frontend (`credentials` = same-origin, JSON, Zeitlimit).
 * Bewusste Ausnahmen mit direktem fetch: Auth-Seiten (/api/auth/*, Antwortformat `{ message }`)
 * und das Fehler-Logging aus den Error-Boundaries (/api/error-log, fire-and-forget).
 */
export { ApiError, getApiErrorMessage, withApiErrorFallback } from './client'
export * from './transactions'
export * from './csvImport'
export * from './users'
export * from './accounts'
export * from './catalog'
export * from './reports'
export * from './split'
export * from './admin'
