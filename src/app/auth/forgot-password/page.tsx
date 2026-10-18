'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/Button'
import AuthAlert from '@/components/auth/AuthAlert'
import AuthFormField from '@/components/auth/AuthFormField'
import AuthPageLayout, { AuthAlternateLink, AuthCard } from '@/components/auth/AuthPageLayout'

/** Wartezeit, bevor der Link erneut angefordert werden kann (wie die Sperre auf dem Server) */
const RESEND_COOLDOWN_SEC = 60

/** Sekunden als „0:42“ */
function formatCountdown(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null)
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

  const remainingSec = cooldownUntil === null ? 0 : Math.max(0, Math.ceil((cooldownUntil - now) / 1000))

  const startCooldown = (seconds: number) => {
    const current = Date.now()
    setNow(current)
    setCooldownUntil(current + seconds * 1000)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)
    const email = new FormData(e.currentTarget).get('email') as string
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await response.json()
      if (response.status === 429 && typeof data.retryAfterSec === 'number') {
        startCooldown(data.retryAfterSec)
      }
      if (!response.ok) throw new Error(data.message || 'Anfrage fehlgeschlagen')
      setMessage(data.message)
      startCooldown(RESEND_COOLDOWN_SEC)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthPageLayout alternateHref="/auth/login" alternateLabel="Anmelden">
      <AuthCard
        title="Passwort vergessen"
        subtitle="Wir schicken dir einen Link, mit dem du ein neues Passwort festlegst."
        footer={
          <AuthAlternateLink prompt="Doch wieder eingefallen?" href="/auth/login" label="Zur Anmeldung" />
        }
      >
        <form className="space-y-5" onSubmit={handleSubmit}>
          {message && (
            <AuthAlert variant="success" title="Prüfe dein Postfach">
              {message} Der Link ist 1 Stunde gültig.
            </AuthAlert>
          )}
          {error && (
            <AuthAlert variant="error" title="Anfrage nicht möglich">
              {error}
            </AuthAlert>
          )}
          <AuthFormField
            id="email"
            name="email"
            label="E-Mail"
            type="email"
            autoComplete="email"
            required
            autoFocus
            placeholder="name@beispiel.de"
          />
          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={loading}
            loadingText="Wird gesendet…"
            disabled={remainingSec > 0}
          >
            {remainingSec > 0 ? (
              <span className="tabular-nums">Erneut senden in {formatCountdown(remainingSec)}</span>
            ) : message ? (
              'Link erneut senden'
            ) : (
              'Link senden'
            )}
          </Button>
        </form>
      </AuthCard>
    </AuthPageLayout>
  )
}
