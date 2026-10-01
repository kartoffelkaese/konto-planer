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
        return 'Es ist ein Konfigurationsfehler aufgetreten. Bitte kontaktiere den Administrator.'
      case 'AccessDenied':
        return 'Zugriff verweigert. Du hast keine Berechtigung für diese Aktion.'
      case 'Verification':
        return 'Der Verifizierungslink ist ungültig oder abgelaufen.'
      case 'CredentialsSignin':
        return 'Anmeldung fehlgeschlagen. Bitte überprüfe deine E-Mail und dein Passwort.'
      default:
        return 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es später erneut.'
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface-muted py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
            Fehler bei der Authentifizierung
          </h2>
          <div className="mt-4">
            <div className="rounded-control bg-danger-subtle p-4">
              <div className="text-sm text-danger">
                {getErrorMessage(error)}
              </div>
            </div>
          </div>
          <div className="mt-6 text-center">
            <Link
              href="/auth/login"
              className="font-medium text-accent hover:text-accent-hover"
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