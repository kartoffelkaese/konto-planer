'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Logge den Fehler
    if (typeof window !== 'undefined') {
      // Client-side logging
      console.error('Client Error:', error)
      
      // Versuche, Fehler an API zu senden
      fetch('/api/error-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          digest: error.digest,
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      }).catch(err => {
        console.error('Failed to send error log:', err)
      })
    }
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="max-w-md w-full bg-surface rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-expense mb-4">
          Etwas ist schiefgelaufen
        </h2>
        <p className="text-primary mb-4">
          Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <details className="mb-4">
            <summary className="text-sm text-secondary mb-2">
              Fehlerdetails
            </summary>
            <pre className="text-xs bg-surface-muted p-2 rounded overflow-auto">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}
        <div className="flex gap-4">
          <button
            onClick={reset}
            className="flex-1 btn-primary font-medium py-2 px-4 rounded-control transition-colors"
          >
            Erneut versuchen
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="flex-1 bg-surface-muted hover:bg-border/30 text-primary font-medium py-2 px-4 rounded-control border border-border transition-colors"
          >
            Zur Startseite
          </button>
        </div>
      </div>
    </div>
  )
}

