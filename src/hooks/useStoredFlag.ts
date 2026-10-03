import { useCallback, useSyncExternalStore } from 'react'

const STORED_FLAG_EVENT = 'konto-planer:stored-flag'

function subscribe(onChange: () => void) {
  window.addEventListener(STORED_FLAG_EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(STORED_FLAG_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

/**
 * Ja/Nein-Wert im localStorage (z. B. „Hinweis ausgeblendet“).
 * `serverValue` gilt beim Server-Rendern, damit nichts kurz aufblitzt.
 */
export function useStoredFlag(key: string, serverValue: boolean): [boolean, () => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => readFlag(key),
    () => serverValue
  )

  const set = useCallback(() => {
    try {
      localStorage.setItem(key, '1')
    } catch {
      // Speicher nicht verfügbar – gilt dann nur bis zum Neuladen nicht
    }
    window.dispatchEvent(new Event(STORED_FLAG_EVENT))
  }, [key])

  return [value, set]
}
