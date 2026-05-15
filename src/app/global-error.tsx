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
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
              Kritischer Fehler
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Ein kritischer Fehler ist aufgetreten. Die Anwendung wurde neu geladen.
            </p>
            <button
              onClick={reset}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Erneut versuchen
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}

