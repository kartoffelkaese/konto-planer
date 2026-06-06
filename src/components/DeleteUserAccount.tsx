'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { TrashIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/Button'

export default function DeleteUserAccount() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [password, setPassword] = useState('')

  const handleDelete = async () => {
    if (confirmText !== 'LÖSCHEN') {
      setError('Bitte geben Sie „LÖSCHEN" ein, um fortzufahren')
      return
    }
    if (!password) {
      setError('Bitte geben Sie Ihr Passwort ein')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/users/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(
          typeof data.error === 'string' ? data.error : 'Fehler beim Löschen der Anmeldung'
        )
      }

      await signOut({ redirect: false })
      window.location.href = '/'
    } catch (err) {
      console.error('Fehler beim Löschen der Anmeldung:', err)
      setError(
        err instanceof Error ? err.message : 'Fehler beim Löschen der Anmeldung'
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-primary">Anmeldung löschen</h2>
      <p className="text-sm text-secondary">
        Entfernt Ihren Zugang zu KontoPlaner (E-Mail und Passwort). Buchführungs-Konten,
        die nur Ihnen gehören, werden dabei mit allen Daten gelöscht. Geteilte Konten
        bleiben für andere Nutzer erhalten. Diese Aktion kann nicht rückgängig gemacht
        werden.
      </p>

      {error && (
        <div className="p-4 bg-danger-subtle text-danger rounded-lg text-sm">{error}</div>
      )}

      {!showConfirmDialog ? (
        <Button type="button" variant="danger" onClick={() => setShowConfirmDialog(true)}>
          <TrashIcon className="h-5 w-5" aria-hidden="true" />
          Anmeldung löschen
        </Button>
      ) : (
        <div className="space-y-4">
          <div>
            <label htmlFor="delete-user-password" className="block text-sm font-medium text-primary">
              Passwort
            </label>
            <input
              type="password"
              id="delete-user-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-control border-border shadow-sm focus:border-danger focus:ring-danger bg-surface text-primary"
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>
          <div>
            <label htmlFor="confirmText" className="block text-sm font-medium text-primary">
              Zur Bestätigung „LÖSCHEN" eingeben
            </label>
            <input
              type="text"
              id="confirmText"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="mt-1 block w-full rounded-control border-border shadow-sm focus:border-danger focus:ring-danger bg-surface text-primary"
              disabled={isLoading}
              autoComplete="off"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowConfirmDialog(false)
                setConfirmText('')
                setPassword('')
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
              disabled={confirmText !== 'LÖSCHEN' || !password}
              loading={isLoading}
              loadingText="Wird gelöscht…"
            >
              Anmeldung endgültig löschen
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
