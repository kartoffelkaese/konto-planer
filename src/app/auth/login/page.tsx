'use client'

import { useState, Suspense, useEffect } from 'react'
import { getSession, signIn, useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/Button'
import PageLoader from '@/components/PageLoader'
import AuthAlert from '@/components/auth/AuthAlert'
import AuthFormField from '@/components/auth/AuthFormField'
import AuthPageLayout, {
  AuthAlternateLink,
  AuthCard,
} from '@/components/auth/AuthPageLayout'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status } = useSession()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [lastEmail, setLastEmail] = useState('')
  const [showResend, setShowResend] = useState(false)

  const verifyError = searchParams.get('verifyError')
  const authError = searchParams.get('error')
  const isVerified = searchParams.get('verified') === 'true'
  const isEmailChanged = searchParams.get('emailChanged') === 'true'

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/')
    }
  }, [status, router])

  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'CredentialsSignin':
        return 'Anmeldung fehlgeschlagen. Bitte überprüfen Sie Ihre E-Mail und Ihr Passwort.'
      case 'EMAIL_NOT_VERIFIED':
        return 'Ihre E-Mail-Adresse wurde noch nicht bestätigt. Bitte prüfen Sie Ihr Postfach.'
      case 'Configuration':
        return 'Es ist ein Konfigurationsfehler aufgetreten. Bitte kontaktieren Sie den Administrator.'
      case 'AccessDenied':
        return 'Zugriff verweigert. Sie haben keine Berechtigung für diese Aktion.'
      case 'Verification':
        return 'Der Verifizierungslink ist ungültig oder abgelaufen.'
      default:
        return 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.'
    }
  }

  const handleResend = async () => {
    if (!lastEmail) return
    setResendLoading(true)
    setResendMessage(null)
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: lastEmail }),
      })
      const data = await response.json()
      setResendMessage(data.message)
    } catch {
      setResendMessage('Anfrage fehlgeschlagen. Bitte später erneut versuchen.')
    } finally {
      setResendLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setResendMessage(null)
    setShowResend(false)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    setLastEmail(email)

    const callbackUrl =
      typeof window !== 'undefined' ? `${window.location.origin}/` : '/'

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      })

      if (result?.error) {
        const message = getErrorMessage(result.error)
        setError(message)
        if (result.error === 'EMAIL_NOT_VERIFIED') {
          setShowResend(true)
        }
        return
      }

      router.push('/')
      router.refresh()
    } catch (err) {
      const session = await getSession()
      if (session?.user) {
        router.push('/')
        router.refresh()
        return
      }
      setError('Ein Fehler ist aufgetreten')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || status === 'authenticated') {
    return <PageLoader message="Wird geladen…" />
  }

  return (
    <AuthPageLayout alternateHref="/auth/register" alternateLabel="Registrieren">
      <AuthCard
        title="Willkommen zurück"
        subtitle="Melden Sie sich an, um Ihre Finanzen fortzusetzen."
        footer={
          <AuthAlternateLink
            prompt="Noch kein Konto?"
            href="/auth/register"
            label="Jetzt registrieren"
          />
        }
      >
        <div className="space-y-5">
          {isVerified && (
            <AuthAlert variant="success" title="E-Mail bestätigt">
              Sie können sich jetzt anmelden.
            </AuthAlert>
          )}

          {isEmailChanged && (
            <AuthAlert variant="success" title="Neue E-Mail bestätigt">
              Bitte melden Sie sich mit Ihrer neuen Adresse an.
            </AuthAlert>
          )}

          {verifyError && (
            <AuthAlert variant="error" title="Bestätigung fehlgeschlagen">
              {verifyError}
            </AuthAlert>
          )}

          {authError && !error && (
            <AuthAlert variant="error" title="Anmeldung nicht möglich">
              {getErrorMessage(authError)}
            </AuthAlert>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <AuthAlert
                variant="error"
                title="Anmeldung fehlgeschlagen"
                actions={
                  showResend ? (
                    <div className="space-y-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        loading={resendLoading}
                        loadingText="Wird gesendet…"
                        onClick={handleResend}
                      >
                        Bestätigungs-E-Mail erneut senden
                      </Button>
                      {resendMessage && (
                        <p className="text-xs text-secondary">{resendMessage}</p>
                      )}
                    </div>
                  ) : undefined
                }
              >
                {error}
              </AuthAlert>
            )}

            <div className="space-y-4">
              <AuthFormField
                id="email"
                name="email"
                label="E-Mail"
                type="email"
                autoComplete="email"
                required
                autoFocus
                placeholder="ihre@email.de"
              />
              <AuthFormField
                id="password"
                name="password"
                label="Passwort"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
              />
            </div>

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={loading}
              loadingText="Anmeldung läuft…"
            >
              Anmelden
            </Button>
          </form>
        </div>
      </AuthCard>
    </AuthPageLayout>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<PageLoader message="Wird geladen…" />}>
      <LoginForm />
    </Suspense>
  )
}
