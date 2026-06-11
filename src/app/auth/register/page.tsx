'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/Button'

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string
    const salaryDay = parseInt(formData.get('salaryDay') as string)

    if (password !== confirmPassword) {
      setError('Die Passwörter stimmen nicht überein')
      setLoading(false)
      return
    }

    if (salaryDay < 1 || salaryDay > 31) {
      setError('Bitte geben Sie einen gültigen Tag des Monats an (1-31)')
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
          password,
          salaryDay,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Ein Fehler ist aufgetreten')
      }

      router.push(
        `/auth/check-email?email=${encodeURIComponent(email)}`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-canvas py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-accent mb-2">KontoPlaner</h1>
          <h2 className="text-xl font-semibold text-primary mb-8">
            Konto erstellen
          </h2>
        </div>

        <div className="section-card-accent p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-lg bg-danger-subtle p-4 text-center border border-border">
                <div className="text-sm text-danger">{error}</div>
              </div>
            )}

            <div className="space-y-4">
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
                  autoComplete="new-password"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-border rounded-lg placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent bg-surface text-primary"
                  placeholder="••••••••"
                />
                <p className="mt-1 text-xs text-secondary">
                  Mindestens 8 Zeichen
                </p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-primary mb-1">
                  Passwort bestätigen
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-border rounded-lg placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent bg-surface text-primary"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label htmlFor="salaryDay" className="block text-sm font-medium text-primary mb-1">
                  Tag der Gehaltszahlung
                </label>
                <input
                  id="salaryDay"
                  name="salaryDay"
                  type="number"
                  min="1"
                  max="31"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-border rounded-lg placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent bg-surface text-primary"
                  placeholder="z.B. 15"
                />
                <p className="mt-1 text-xs text-secondary">
                  Tag des Monats, an dem Sie Ihr Gehalt erhalten (1-31)
                </p>
              </div>
            </div>

            <div>
              <Button
                type="submit"
                fullWidth
                size="lg"
                loading={loading}
                loadingText="Registrierung läuft…"
              >
                Registrieren
              </Button>
            </div>
          </form>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/auth/login"
            className="text-sm font-medium text-accent hover:text-accent-hover transition-colors duration-feedback"
          >
            Bereits registriert? Jetzt anmelden →
          </Link>
        </div>
      </div>
    </main>
  )
} 