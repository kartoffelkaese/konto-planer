'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/Button'
import PageLoader from '@/components/PageLoader'
import AuthAlert from '@/components/auth/AuthAlert'
import AuthFormField from '@/components/auth/AuthFormField'
import PasswordRequirements from '@/components/auth/PasswordRequirements'
import AuthPageLayout, {
  AuthAlternateLink,
  AuthCard,
} from '@/components/auth/AuthPageLayout'
import { validatePassword } from '@/lib/password-policy'

export default function RegisterPage() {
  const router = useRouter()
  const { status } = useSession()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMismatch, setPasswordMismatch] = useState(false)

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/')
    }
  }, [status, router])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setPasswordMismatch(false)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const passwordValue = formData.get('password') as string
    const confirmPasswordValue = formData.get('confirmPassword') as string
    const salaryDay = parseInt(formData.get('salaryDay') as string, 10)

    const passwordError = validatePassword(passwordValue)
    if (passwordError) {
      setError(passwordError)
      setLoading(false)
      return
    }

    if (passwordValue !== confirmPasswordValue) {
      setPasswordMismatch(true)
      setError('Die Passwörter stimmen nicht überein.')
      setLoading(false)
      return
    }

    if (salaryDay < 1 || salaryDay > 31) {
      setError('Bitte geben Sie einen gültigen Tag des Monats an (1–31).')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password: passwordValue,
          salaryDay,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Ein Fehler ist aufgetreten')
      }

      router.push(`/auth/check-email?email=${encodeURIComponent(email)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || status === 'authenticated') {
    return <PageLoader message="Wird geladen…" />
  }

  return (
    <AuthPageLayout alternateHref="/auth/login" alternateLabel="Anmelden">
      <AuthCard
        title="Konto erstellen"
        subtitle="Kostenlos starten – in unter einer Minute eingerichtet."
        footer={
          <AuthAlternateLink
            prompt="Bereits registriert?"
            href="/auth/login"
            label="Jetzt anmelden"
          />
        }
      >
        <form className="space-y-5" onSubmit={handleSubmit}>
          {error && (
            <AuthAlert variant="error" title="Registrierung nicht möglich">
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

            <div>
              <AuthFormField
                id="password"
                name="password"
                label="Passwort"
                type="password"
                autoComplete="new-password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                hint="Mindestens 8 Zeichen, ein Buchstabe und eine Ziffer."
              />
              <PasswordRequirements password={password} />
            </div>

            <AuthFormField
              id="confirmPassword"
              name="confirmPassword"
              label="Passwort bestätigen"
              type="password"
              autoComplete="new-password"
              required
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                setPasswordMismatch(false)
              }}
              hint={
                passwordMismatch ? 'Die Passwörter stimmen nicht überein.' : undefined
              }
              hintClassName={passwordMismatch ? 'mt-1.5 text-xs text-danger' : undefined}
              inputClassName={
                passwordMismatch
                  ? 'block w-full rounded-control border border-danger bg-surface px-3 py-2.5 text-primary shadow-sm placeholder:text-secondary focus:border-danger focus:outline-none focus:ring-2 focus:ring-danger/30 sm:text-sm'
                  : undefined
              }
            />

            <AuthFormField
              id="salaryDay"
              name="salaryDay"
              label="Tag der Gehaltszahlung"
              type="number"
              min={1}
              max={31}
              defaultValue={15}
              required
              placeholder="z.B. 15"
              hint="Legt den Start Ihres Gehaltsmonats fest – z. B. der 15., wenn Sie Mitte des Monats Gehalt erhalten."
            />
          </div>

          <AuthAlert variant="info">
            Nach der Registrierung erhalten Sie eine E-Mail mit einem Bestätigungslink. Erst danach
            können Sie sich anmelden.
          </AuthAlert>

          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={loading}
            loadingText="Registrierung läuft…"
          >
            Kostenlos registrieren
          </Button>
        </form>
      </AuthCard>
    </AuthPageLayout>
  )
}
