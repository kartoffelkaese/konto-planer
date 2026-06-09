'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Logge kritische Fehler
    if (typeof window !== 'undefined') {
      console.error('Global Error:', error)
      
      // Versuche, Fehler an API zu senden
      fetch('/api/error-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          digest: error.digest,
          type: 'global-error',
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      }).catch(err => {
        console.error('Failed to send error log:', err)
      })
    }
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
          <div className="max-w-md w-full bg-surface rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-expense mb-4">
              Kritischer Fehler
            </h2>
            <p className="text-primary mb-4">
              Ein kritischer Fehler ist aufgetreten. Die Anwendung wurde neu geladen.
            </p>
            <button
              onClick={reset}
              className="w-full btn-primary font-medium py-2 px-4 rounded-control transition-colors"
            >
              Erneut versuchen
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}

