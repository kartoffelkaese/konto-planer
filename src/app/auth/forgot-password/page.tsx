'use client'

import { useState } from 'react'
import { Button } from '@/components/Button'
import AuthAlert from '@/components/auth/AuthAlert'
import AuthFormField from '@/components/auth/AuthFormField'
import AuthPageLayout, { AuthAlternateLink, AuthCard } from '@/components/auth/AuthPageLayout'

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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
      if (!response.ok) throw new Error(data.message || 'Anfrage fehlgeschlagen')
      setMessage(data.message)
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
          <Button type="submit" fullWidth size="lg" loading={loading} loadingText="Wird gesendet…">
            Link senden
          </Button>
        </form>
      </AuthCard>
    </AuthPageLayout>
  )
}
