import { useEffect, useRef } from 'react'
import { useUserSettings } from '@/hooks/useUserSettings'
import { ACCOUNT_CHANGED_EVENT, TRANSACTIONS_CHANGED_EVENT } from '@/lib/accountSwitchEvents'

/** Daten neu laden, wenn das aktive Konto gewechselt wird oder sich Buchungen im Hintergrund ändern. */
export function useActiveAccountReload(onReload: () => void) {
  const { settings } = useUserSettings()
  const activeAccountId = settings?.activeAccountId
  const onReloadRef = useRef(onReload)
  // Immer die aktuelle Funktion aufrufen, ohne sie zur Effekt-Abhängigkeit zu machen
  useEffect(() => {
    onReloadRef.current = onReload
  })

  useEffect(() => {
    onReloadRef.current()
  }, [activeAccountId])

  useEffect(() => {
    const handler = () => onReloadRef.current()
    window.addEventListener(ACCOUNT_CHANGED_EVENT, handler)
    window.addEventListener(TRANSACTIONS_CHANGED_EVENT, handler)
    return () => {
      window.removeEventListener(ACCOUNT_CHANGED_EVENT, handler)
      window.removeEventListener(TRANSACTIONS_CHANGED_EVENT, handler)
    }
  }, [])
}
