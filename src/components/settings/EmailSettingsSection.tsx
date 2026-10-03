'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/Button'
import PasswordChangeForm from '@/components/settings/PasswordChangeForm'
import { useToast } from '@/hooks/useToast'
import {
  cancelPendingEmailChange,
  requestEmailChange,
  resendEmailChange,
  withApiErrorFallback,
} from '@/lib/api'

type EmailSettingsSectionProps = {
  /** Ausstehende neue Adresse (kommt aus den Benutzereinstellungen) */
  pendingEmail: string | null
  onPendingEmailChange: (pendingEmail: string | null) => void
}

/** Einstellungen → „Benutzerkonto“: E-Mail-Adresse ändern, ausstehende Änderung verwalten */
export default function EmailSettingsSection({
  pendingEmail,
  onPendingEmailChange,
}: EmailSettingsSectionProps) {
  const { data: session } = useSession()
  const { showToast } = useToast()
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailLoading, setEmailLoading] = useState(false)
  const [pendingResendLoading, setPendingResendLoading] = useState(false)

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailLoading(true)
    setEmailError(null)
    try {
      const data = await withApiErrorFallback(
        requestEmailChange(newEmail, password),
        'Ein Fehler ist aufgetreten'
      )

      showToast(
        `Bestätigungs-E-Mail an ${data.pendingEmail} gesendet`,
        'success'
      )
      onPendingEmailChange(data.pendingEmail ?? null)
      setShowEmailForm(false)
      setNewEmail('')
      setPassword('')
    } catch (err) {
      console.error('Error updating email:', err)
      const message = err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten'
      setEmailError(message)
      showToast(message, 'error')
    } finally {
      setEmailLoading(false)
    }
  }

  const handleCancelPendingEmail = async () => {
    setEmailLoading(true)
    setEmailError(null)
    try {
      await withApiErrorFallback(cancelPendingEmailChange(), 'Abbrechen fehlgeschlagen')
      onPendingEmailChange(null)
      showToast('Ausstehende E-Mail-Änderung abgebrochen', 'success')
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten'
      setEmailError(message)
      showToast(message, 'error')
    } finally {
      setEmailLoading(false)
    }
  }

  const handleResendPendingEmail = async () => {
    setPendingResendLoading(true)
    setEmailError(null)
    try {
      await withApiErrorFallback(resendEmailChange(), 'Senden fehlgeschlagen')
      showToast('Bestätigungs-E-Mail erneut gesendet', 'success')
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten'
      setEmailError(message)
      showToast(message, 'error')
    } finally {
      setPendingResendLoading(false)
    }
  }

  return (
    <div id="email-settings" className="card p-4 md:p-5">
      <h2 className="text-lg font-medium text-primary mb-1">Benutzerkonto</h2>
      <p className="text-sm text-secondary mb-4">Anmeldung, E-Mail-Adresse und Passwort</p>
      
      {emailError && (
        <div className="mb-4 p-4 bg-danger-subtle text-danger rounded-lg">
          {emailError}
        </div>
      )}

      {pendingEmail && (
        <div className="mb-4 p-4 bg-accent-subtle rounded-lg border border-border">
          <p className="text-sm text-primary">
            Ausstehende Änderung auf{' '}
            <span className="font-medium">{pendingEmail}</span>. Bitte
            bestätige den Link in deinem Postfach.
          </p>
          <p className="text-xs text-secondary mt-1">
            Du bist weiterhin mit {session?.user?.email} angemeldet, bis
            die neue Adresse bestätigt ist.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={pendingResendLoading}
              loadingText="Wird gesendet…"
              onClick={handleResendPendingEmail}
            >
              Link erneut senden
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancelPendingEmail}
              disabled={emailLoading}
            >
              Abbrechen
            </Button>
          </div>
        </div>
      )}

      {!showEmailForm ? (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-secondary">Aktuelle E-Mail-Adresse</p>
            <p className="font-medium text-primary">{session?.user?.email}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowEmailForm(true)}
            disabled={!!pendingEmail}
          >
            Ändern
          </Button>
        </div>
      ) : (
        <form onSubmit={handleEmailChange} className="space-y-4">
          <div>
            <label htmlFor="newEmail" className="block text-sm font-medium text-primary">
              Neue E-Mail-Adresse
            </label>
            <input
              type="email"
              id="newEmail"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="mt-1 block w-full rounded-control border-border shadow-sm focus:border-accent focus:ring-accent bg-surface text-primary"
              required
              disabled={emailLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-primary">
              Passwort
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-control border-border shadow-sm focus:border-accent focus:ring-accent bg-surface text-primary"
              required
              disabled={emailLoading}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setShowEmailForm(false)}>
              Abbrechen
            </Button>
            <Button type="submit" loading={emailLoading} loadingText="Wird gesendet…">
              Bestätigung anfordern
            </Button>
          </div>
        </form>
      )}

      <div className="mt-4 border-t border-hairline pt-4">
        <PasswordChangeForm />
      </div>
    </div>
  )
}
