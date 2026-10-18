'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { TrashIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/Button'
import { deleteUserLogin, withApiErrorFallback } from '@/lib/api'

export default function DeleteUserAccount() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [password, setPassword] = useState('')

  const handleDelete = async () => {
    if (confirmText !== 'LÖSCHEN') {
      setError('Bitte gib „LÖSCHEN“ ein, um fortzufahren')
      return
    }
    if (!password) {
      setError('Bitte gib dein Passwort ein')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      await withApiErrorFallback(deleteUserLogin(password), 'Fehler beim Löschen der Anmeldung')

      await signOut({ redirect: false })
      // Volles Neuladen: nach dem Löschen soll kein Zustand der alten Sitzung übrig bleiben
      window.location.assign(window.location.origin)
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
      <div>
        <h3 className="text-lg font-semibold text-primary mb-1">Anmeldung löschen</h3>
        <p className="text-sm text-secondary">
          Entfernt deinen Zugang zu KontoPlaner (E-Mail und Passwort). Buchführungs-Konten,
          die nur dir gehören, werden dabei mit allen Daten gelöscht. Geteilte Konten
          bleiben für andere Nutzer erhalten. Diese Aktion kann nicht rückgängig gemacht
          werden.
        </p>
      </div>

      {error && (
        <div className="rounded-control bg-danger-subtle p-4 text-sm text-danger">{error}</div>
      )}

      {!showConfirmDialog ? (
        <Button type="button" variant="danger-outline" onClick={() => setShowConfirmDialog(true)}>
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
              className="mt-1 block w-full"
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>
          <div>
            <label htmlFor="confirmText" className="block text-sm font-medium text-primary">
              Zur Bestätigung „LÖSCHEN“ eingeben
            </label>
            <input
              type="text"
              id="confirmText"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="mt-1 block w-full"
              disabled={isLoading}
              autoComplete="off"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
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
