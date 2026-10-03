import { useSyncExternalStore } from 'react'

const subscribeNever = () => () => {}

/**
 * false beim Server-Rendern und während der Hydration, danach true – ohne zusätzlichen
 * Render-Durchlauf über setState im Effekt.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false
  )
}
