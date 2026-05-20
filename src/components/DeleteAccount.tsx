'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { TrashIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/Button'

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
      <h3 className="text-lg font-medium text-primary">Konto löschen</h3>
      <p className="text-sm text-secondary">
        Wenn Sie Ihr Konto löschen, werden alle Ihre Daten unwiderruflich gelöscht.
        Diese Aktion kann nicht rückgängig gemacht werden.
      </p>

      {error && (
        <div className="p-4 bg-danger-subtle text-danger rounded-lg">
          {error}
        </div>
      )}

      {!showConfirmDialog ? (
        <Button type="button" variant="danger" onClick={() => setShowConfirmDialog(true)}>
          <TrashIcon className="h-5 w-5" aria-hidden="true" />
          Konto löschen
        </Button>
      ) : (
        <div className="space-y-4">
          <div>
            <label htmlFor="confirmText" className="block text-sm font-medium text-primary">
              Geben Sie "LÖSCHEN" ein, um das Konto zu löschen
            </label>
            <input
              type="text"
              id="confirmText"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="mt-1 block w-full rounded-control border-border shadow-sm focus:border-danger focus:ring-danger bg-surface text-primary"
              disabled={isLoading}
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowConfirmDialog(false)
                setConfirmText('')
                setError(null)
              }}
              disabled={isLoading}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              disabled={confirmText !== 'LÖSCHEN'}
              loading={isLoading}
              loadingText="Wird gelöscht…"
            >
              Konto löschen
            </Button>
          </div>
        </div>
      )}
    </div>
  )
} 