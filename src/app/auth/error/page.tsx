'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'Configuration':
        return 'Es ist ein Konfigurationsfehler aufgetreten. Bitte kontaktieren Sie den Administrator.'
      case 'AccessDenied':
        return 'Zugriff verweigert. Sie haben keine Berechtigung für diese Aktion.'
      case 'Verification':
        return 'Der Verifizierungslink ist ungültig oder abgelaufen.'
      case 'CredentialsSignin':
        return 'Anmeldung fehlgeschlagen. Bitte überprüfen Sie Ihre E-Mail und Ihr Passwort.'
      default:
        return 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.'
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Fehler bei der Authentifizierung
          </h2>
          <div className="mt-4">
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">
                {getErrorMessage(error)}
              </div>
            </div>
          </div>
          <div className="mt-6 text-center">
            <Link
              href="/auth/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Zurück zur Anmeldung
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function AuthError() {
  return (
    <Suspense>
      <ErrorContent />
    </Suspense>
  )
} 