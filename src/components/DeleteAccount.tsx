'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { TrashIcon } from '@heroicons/react/24/outline'

export default function DeleteAccount() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  const handleDelete = async () => {
    if (confirmText !== 'LÖSCHEN') {
      setError('Bitte geben Sie "LÖSCHEN" ein, um das Konto zu löschen')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/users/delete', {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Fehler beim Löschen des Kontos')
      }

      // Logge den Benutzer aus und leite zur Startseite weiter
      await signOut({ callbackUrl: '/' })
    } catch (err) {
      console.error('Fehler beim Löschen des Kontos:', err)
      setError('Fehler beim Löschen des Kontos')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Konto löschen</h3>
      <p className="text-sm text-gray-500">
        Wenn Sie Ihr Konto löschen, werden alle Ihre Daten unwiderruflich gelöscht.
        Diese Aktion kann nicht rückgängig gemacht werden.
      </p>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {!showConfirmDialog ? (
        <button
          onClick={() => setShowConfirmDialog(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <TrashIcon className="h-5 w-5 mr-2" />
          Konto löschen
        </button>
      ) : (
        <div className="space-y-4">
          <div>
            <label htmlFor="confirmText" className="block text-sm font-medium text-gray-700">
              Geben Sie "LÖSCHEN" ein, um das Konto zu löschen
            </label>
            <input
              type="text"
              id="confirmText"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
              disabled={isLoading}
            />
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => {
                setShowConfirmDialog(false)
                setConfirmText('')
                setError(null)
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              disabled={isLoading}
            >
              Abbrechen
            </button>
            <button
              onClick={handleDelete}
              disabled={isLoading || confirmText !== 'LÖSCHEN'}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
            >
              {isLoading ? 'Wird gelöscht...' : 'Konto löschen'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
} 