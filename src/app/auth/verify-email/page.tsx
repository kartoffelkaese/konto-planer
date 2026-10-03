'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/Button'
import PageLoader from '@/components/PageLoader'
import AuthAlert from '@/components/auth/AuthAlert'
import AuthPageLayout, { AuthCard } from '@/components/auth/AuthPageLayout'

type VerifyResponse = { ok: true; purpose: 'SIGNUP' | 'EMAIL_CHANGE' } | { ok: false; error?: string }

/**
 * Bestätigt erst per Klick (POST). Automatische Link-Prüfer in Mailprogrammen öffnen den Link,
 * klicken aber keine Knöpfe – so bestätigt nur die Person, der das Postfach gehört.
 */
function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  const handleConfirm = async () => {
    if (!token) return
    setLoading(true)
    setFailed(false)
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = (await response.json()) as VerifyResponse
      if (data.ok) {
        router.replace(
          data.purpose === 'EMAIL_CHANGE'
            ? '/auth/login?emailChanged=true'
            : '/auth/login?verified=true'
        )
        return
      }
      router.replace(`/auth/login?verifyError=${encodeURIComponent(data.error ?? 'invalid')}`)
    } catch {
      setFailed(true)
      setLoading(false)
    }
  }

  return (
    <AuthPageLayout alternateHref="/auth/login" alternateLabel="Anmelden">
      <AuthCard
        title="E-Mail bestätigen"
        subtitle="Ein Klick noch, dann ist deine Adresse bestätigt."
      >
        <div className="space-y-5">
          {!token && (
            <AuthAlert variant="error" title="Link unvollständig">
              Der Bestätigungslink ist unvollständig. Bitte öffne ihn erneut aus der E-Mail.
            </AuthAlert>
          )}
          {failed && (
            <AuthAlert variant="error" title="Bestätigung fehlgeschlagen">
              Die Anfrage ist fehlgeschlagen. Bitte versuche es erneut.
            </AuthAlert>
          )}
          <Button
            type="button"
            fullWidth
            size="lg"
            disabled={!token}
            loading={loading}
            loadingText="Wird bestätigt…"
            onClick={handleConfirm}
          >
            E-Mail bestätigen
          </Button>
        </div>
      </AuthCard>
    </AuthPageLayout>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<PageLoader message="Wird geladen…" />}>
      <VerifyEmailContent />
    </Suspense>
  )
}
