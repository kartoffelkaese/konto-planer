'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/Button'
import PageLoader from '@/components/PageLoader'
import AuthAlert from '@/components/auth/AuthAlert'
import AuthFormField from '@/components/auth/AuthFormField'
import PasswordRequirements from '@/components/auth/PasswordRequirements'
import AuthPageLayout, { AuthAlternateLink, AuthCard } from '@/components/auth/AuthPageLayout'
import { validatePassword } from '@/lib/password-policy'

function ResetPasswordForm() {
  const router = useRouter()
  const token = useSearchParams().get('token')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const policyError = validatePassword(password)
    if (policyError) {
      setError(policyError)
      return
    }
    if (password !== confirmPassword) {
      setError('Die Passwörter stimmen nicht überein.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Ein Fehler ist aufgetreten')
      router.replace('/auth/login?passwordReset=true')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
      setLoading(false)
    }
  }

  return (
    <AuthPageLayout alternateHref="/auth/login" alternateLabel="Anmelden">
      <AuthCard
        title="Neues Passwort"
        subtitle="Danach werden alle bestehenden Anmeldungen beendet."
        footer={
          <AuthAlternateLink prompt="Link abgelaufen?" href="/auth/forgot-password" label="Neuen Link anfordern" />
        }
      >
        <form className="space-y-5" onSubmit={handleSubmit}>
          {!token && (
            <AuthAlert variant="error" title="Link unvollständig">
              Der Link ist unvollständig. Bitte öffne ihn erneut aus der E-Mail.
            </AuthAlert>
          )}
          {error && (
            <AuthAlert variant="error" title="Passwort nicht geändert">
              {error}
            </AuthAlert>
          )}
          <div className="space-y-4">
            <div>
              <AuthFormField
                id="password"
                name="password"
                label="Neues Passwort"
                type="password"
                autoComplete="new-password"
                required
                autoFocus
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
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            fullWidth
            size="lg"
            disabled={!token}
            loading={loading}
            loadingText="Wird gespeichert…"
          >
            Passwort speichern
          </Button>
        </form>
      </AuthCard>
    </AuthPageLayout>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<PageLoader message="Wird geladen…" />}>
      <ResetPasswordForm />
    </Suspense>
  )
}
