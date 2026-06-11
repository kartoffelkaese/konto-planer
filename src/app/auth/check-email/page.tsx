'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/Button'

function CheckEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleResend = async () => {
    if (!email) return
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Anfrage fehlgeschlagen')
      }
      setMessage(data.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-canvas py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-accent mb-2">
          KontoPlaner
        </h1>
        <h2 className="text-xl font-semibold text-primary mb-4">
          E-Mail bestätigen
        </h2>
        <div className="section-card-accent p-8 space-y-4 text-left">
          <p className="text-sm text-primary">
            Wir haben Ihnen eine E-Mail{email ? ` an ${email}` : ''} mit einem
            Bestätigungslink gesendet. Bitte klicken Sie auf den Link, um Ihr
            Konto zu aktivieren.
          </p>
          <p className="text-xs text-secondary">
            Der Link ist 24 Stunden gültig. Prüfen Sie auch Ihren Spam-Ordner.
          </p>
          {message && (
            <div className="rounded-lg bg-income-bg p-3 text-sm text-income border border-border">
              {message}
            </div>
          )}
          {error && (
            <div className="rounded-lg bg-danger-subtle p-3 text-sm text-danger border border-border">
              {error}
            </div>
          )}
          {email && (
            <Button
              type="button"
              fullWidth
              variant="secondary"
              loading={loading}
              loadingText="Wird gesendet…"
              onClick={handleResend}
            >
              Bestätigungs-E-Mail erneut senden
            </Button>
          )}
        </div>
        <div className="mt-6">
          <Link
            href="/auth/login"
            className="text-sm font-medium text-accent hover:text-accent-hover"
          >
            Zur Anmeldung →
          </Link>
        </div>
      </div>
    </main>
  )
}

export default function CheckEmailPage() {
  return (
    <Suspense>
      <CheckEmailContent />
    </Suspense>
  )
}
