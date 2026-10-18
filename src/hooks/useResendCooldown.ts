'use client'

import { useCallback, useEffect, useState } from 'react'

/** Wartezeit vor „erneut senden“ – wie die Sperre auf dem Server (`RATE_LIMITS.mailCooldown`) */
export const RESEND_COOLDOWN_SEC = 60

/** Sekunden als „0:42“ */
export function formatCountdown(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/** Restzeit aus einer 429-Antwort der Mail-Sperre (`{ retryAfterSec }`), sonst `null` */
export function getRetryAfterSec(data: unknown): number | null {
  if (typeof data !== 'object' || data === null || !('retryAfterSec' in data)) return null
  const value = (data as { retryAfterSec: unknown }).retryAfterSec
  return typeof value === 'number' && value > 0 ? value : null
}

/**
 * Countdown für „E-Mail erneut senden“: nach dem Versand `start()`, solange `remainingSec > 0`
 * ist der Button gesperrt. `initialSec` startet die Wartezeit sofort (z. B. direkt nach der
 * Registrierung).
 */
export function useResendCooldown(initialSec = 0) {
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(() =>
    initialSec > 0 ? Date.now() + initialSec * 1000 : null
  )
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (cooldownUntil === null) return
    const timer = setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= cooldownUntil) setCooldownUntil(null)
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldownUntil])

  const start = useCallback((seconds: number = RESEND_COOLDOWN_SEC) => {
    const current = Date.now()
    setNow(current)
    setCooldownUntil(current + seconds * 1000)
  }, [])

  const remainingSec =
    cooldownUntil === null ? 0 : Math.max(0, Math.ceil((cooldownUntil - now) / 1000))

  return { remainingSec, start }
}
