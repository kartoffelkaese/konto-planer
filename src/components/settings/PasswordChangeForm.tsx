'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/Button'
import PasswordRequirements from '@/components/auth/PasswordRequirements'
import { useToast } from '@/hooks/useToast'
import { changePassword, withApiErrorFallback } from '@/lib/api'
import { validatePassword } from '@/lib/password-policy'

const inputClassName =
  'mt-1 block w-full rounded-control border-border shadow-sm focus:border-accent focus:ring-accent bg-surface text-primary'

/** Einstellungen → „Benutzerkonto“: Passwort ändern; andere Anmeldungen werden dabei beendet */
export default function PasswordChangeForm() {
  const { update } = useSession()
  const { showToast } = useToast()
  const [open, setOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const reset = () => {
    setOpen(false)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const policyError = validatePassword(newPassword)
    if (policyError) {
      setError(policyError)
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Die neuen Passwörter stimmen nicht überein.')
      return
    }

    setLoading(true)
    try {
      await withApiErrorFallback(
        changePassword(currentPassword, newPassword),
        'Passwort konnte nicht geändert werden'
      )
      // Diese Sitzung auf die neue Version heben – alle anderen Anmeldungen sind damit beendet
      await update({ refreshSessionVersion: true })
      showToast('Passwort geändert. Andere Anmeldungen wurden beendet.', 'success')
      reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-secondary">Passwort</p>
          <p className="font-medium text-primary" aria-hidden="true">••••••••</p>
        </div>
        <Button type="button" variant="ghost" onClick={() => setOpen(true)}>
          Ändern
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="p-4 bg-danger-subtle text-danger rounded-lg">{error}</div>}

      <div>
        <label htmlFor="currentPassword" className="block text-sm font-medium text-primary">
          Aktuelles Passwort
        </label>
        <input
          type="password"
          id="currentPassword"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className={inputClassName}
          required
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="newPassword" className="block text-sm font-medium text-primary">
          Neues Passwort
        </label>
        <input
          type="password"
          id="newPassword"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className={inputClassName}
          required
          disabled={loading}
        />
        <PasswordRequirements password={newPassword} />
      </div>

      <div>
        <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-primary">
          Neues Passwort bestätigen
        </label>
        <input
          type="password"
          id="confirmNewPassword"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={inputClassName}
          required
          disabled={loading}
        />
      </div>

      <p className="text-xs text-secondary">
        Auf allen anderen Geräten wirst du danach abgemeldet.
      </p>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={reset} disabled={loading}>
          Abbrechen
        </Button>
        <Button type="submit" loading={loading} loadingText="Wird gespeichert…">
          Passwort ändern
        </Button>
      </div>
    </form>
  )
}
