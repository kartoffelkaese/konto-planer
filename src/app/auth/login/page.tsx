'use client'

import { useState, Suspense } from 'react'
import { getSession, signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/Button'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const getErrorMessage = (error: string) => {
    switch (error) {
      case 'CredentialsSignin':
        return 'Anmeldung fehlgeschlagen. Bitte überprüfen Sie Ihre E-Mail und Ihr Passwort.'
      default:
        return error
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

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
        setError(getErrorMessage(result.error))
        return
      }

      router.push('/')
      router.refresh()
    } catch (err) {
      // Session kann trotzdem gesetzt sein (z. B. relative Redirect-URL von Auth.js)
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

  return (
    <main id="login-page" className="min-h-screen flex flex-col items-center justify-center bg-canvas py-12 px-4 sm:px-6 lg:px-8">
      <div id="login-container" className="max-w-md w-full">
        <div id="login-header" className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-accent mb-2">KontoPlaner</h1>
          <h2 className="text-xl font-semibold text-primary mb-8">
            Willkommen zurück
          </h2>
          {searchParams.get('registered') === 'true' && (
            <div id="registration-success" className="mb-4 p-4 bg-income-bg rounded-lg border border-border">
              <p className="text-income">
                Registrierung erfolgreich! Sie können sich jetzt anmelden.
              </p>
            </div>
          )}
        </div>
        
        <div id="login-form-container" className="section-card-accent p-8">
          <form id="login-form" className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div id="error-message" className="rounded-lg bg-danger-subtle p-4 text-center border border-border">
                <div className="text-sm text-danger">{error}</div>
              </div>
            )}
            
            <div id="form-fields" className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-primary mb-1">
                  E-Mail
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-border rounded-lg placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent bg-surface text-primary"
                  placeholder="ihre@email.de"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-primary mb-1">
                  Passwort
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-border rounded-lg placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent bg-surface text-primary"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <Button
                type="submit"
                fullWidth
                size="lg"
                loading={loading}
                loadingText="Anmeldung läuft…"
              >
                Anmelden
              </Button>
            </div>
          </form>
        </div>

        <div id="register-link" className="mt-6 text-center">
          <Link
            href="/auth/register"
            className="text-sm font-medium text-accent hover:text-accent-hover transition-colors duration-feedback"
          >
            Noch kein Konto? Jetzt registrieren →
          </Link>
        </div>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
} 