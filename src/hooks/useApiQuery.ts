'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type QueryState<T> = {
  /** Schlüssel der Anfrage, zu der `data`/`error` gehören */
  settledKey: string | null
  data: T | undefined
  error: unknown
}

type UseApiQueryOptions<T> = {
  /** false = nicht laden (z. B. solange eine ID fehlt) */
  enabled?: boolean
  /** Wird nach einem Fehler aufgerufen (asynchron, nicht im Effekt-Körper) */
  onError?: (error: unknown) => void
  /** Wird nach erfolgreichem Laden aufgerufen */
  onSuccess?: (data: T) => void
}

/**
 * Lädt Daten über eine Funktion aus `@/lib/api` und liefert `{ data, error, loading, reload }`.
 *
 * `key` identifiziert die Anfrage: ändert er sich, wird neu geladen (wie Effekt-Abhängigkeiten).
 * `loading` wird abgeleitet statt synchron im Effekt gesetzt (keine „set-state-in-effect“-Kaskaden).
 * Veraltete Antworten (Schlüssel inzwischen geändert, Komponente entfernt) werden verworfen.
 */
export function useApiQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseApiQueryOptions<T> = {}
) {
  const { enabled = true } = options
  const [reloadCount, setReloadCount] = useState(0)
  const [state, setState] = useState<QueryState<T>>({
    settledKey: null,
    data: undefined,
    error: null,
  })

  // Aktuelle Funktionen merken, ohne sie zu Effekt-Abhängigkeiten zu machen
  const fetcherRef = useRef(fetcher)
  const optionsRef = useRef(options)
  useEffect(() => {
    fetcherRef.current = fetcher
    optionsRef.current = options
  })

  const requestKey = `${key}#${reloadCount}`

  useEffect(() => {
    if (!enabled) return
    let active = true
    fetcherRef.current().then(
      (data) => {
        if (!active) return
        setState({ settledKey: requestKey, data, error: null })
        optionsRef.current.onSuccess?.(data)
      },
      (error: unknown) => {
        if (!active) return
        setState((prev) => ({ settledKey: requestKey, data: prev.data, error }))
        optionsRef.current.onError?.(error)
      }
    )
    return () => {
      active = false
    }
  }, [requestKey, enabled])

  const reload = useCallback(() => setReloadCount((count) => count + 1), [])

  return {
    data: state.data,
    error: state.error,
    loading: enabled && state.settledKey !== requestKey,
    reload,
  }
}
