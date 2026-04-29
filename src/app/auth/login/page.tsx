'use client'

import { useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

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

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl: '/transactions'
      })

      if (result?.error) {
        setError(getErrorMessage(result.error))
      } else {
        router.push('/transactions')
        router.refresh()
      }
    } catch (err) {
      setError('Ein Fehler ist aufgetreten')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main id="login-page" className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div id="login-container" className="max-w-md w-full">
        <div id="login-header" className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Konto-Planer</h1>
          <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-8">
            Willkommen zurück
          </h2>
          {searchParams.get('registered') === 'true' && (
            <div id="registration-success" className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-green-700 dark:text-green-300">
                Registrierung erfolgreich! Sie können sich jetzt anmelden.
              </p>
            </div>
          )}
        </div>
        
        <div id="login-form-container" className="p-8 rounded-xl shadow-lg bg-white dark:bg-gray-800">
          <form id="login-form" className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div id="error-message" className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-center">
                <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
              </div>
            )}
            
            <div id="form-fields" className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  E-Mail
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="ihre@email.de"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Passwort
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 disabled:bg-blue-300 dark:disabled:bg-blue-700 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Anmeldung läuft...
                  </div>
                ) : (
                  'Anmelden'
                )}
              </button>
            </div>
          </form>
        </div>

        <div id="register-link" className="mt-6 text-center">
          <Link
            href="/auth/register"
            className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200"
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