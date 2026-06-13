'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { TagIcon, BuildingStorefrontIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import BackupManager from '@/components/BackupManager'
import DeleteFinancialAccount from '@/components/DeleteFinancialAccount'
import DeleteUserAccount from '@/components/DeleteUserAccount'
import { useToast } from '@/hooks/useToast'
import ColorSchemeSwitcher from '@/components/ColorSchemeSwitcher'
import AccountSharing from '@/components/AccountSharing'
import AccountInvitations from '@/components/AccountInvitations'
import CreateAdditionalAccount from '@/components/CreateAdditionalAccount'
import BankSelect from '@/components/BankSelect'
import PageContextHeader from '@/components/PageContextHeader'
import PageLoader from '@/components/PageLoader'
import { useUserSettings } from '@/hooks/useUserSettings'
import { isCsvImportAvailableForBank } from '@/lib/csvImport/bankFormats'
import { Button } from '@/components/Button'
import { dispatchAccountChanged } from '@/lib/accountSwitchEvents'

export default function SettingsPage() {
  const { showToast } = useToast()
  const {
    canWrite,
    role,
    accountName: activeAccountName,
  } = useUserSettings()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [salaryDay, setSalaryDay] = useState(1)
  const [accountName, setAccountName] = useState("Mein Konto")
  const [transferSenderName, setTransferSenderName] = useState('')
  const [bankId, setBankId] = useState<string | null>(null)
  const [isSimpleAccount, setIsSimpleAccount] = useState(false)
  const [simpleAccountError, setSimpleAccountError] = useState<string | null>(null)
  // Neue States für E-Mail-Änderung
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailLoading, setEmailLoading] = useState(false)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [pendingResendLoading, setPendingResendLoading] = useState(false)
  const [initialLoadDone, setInitialLoadDone] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    const onAccountChanged = () => loadSettings()
    window.addEventListener('account-changed', onAccountChanged)
    return () => window.removeEventListener('account-changed', onAccountChanged)
  }, [])

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/users/settings')
      if (!response.ok) {
        if (response.status !== 404) {
          throw new Error('Fehler beim Laden der Einstellungen')
        }
        return // 404 ist OK, bedeutet nur dass noch keine Einstellungen existieren
      }
      const data = await response.json()
      setSalaryDay(data.salaryDay)
      setAccountName(data.accountName || "Mein Konto")
      setTransferSenderName(data.transferSenderName || '')
      setBankId(data.bankId ?? null)
      setIsSimpleAccount(Boolean(data.isSimpleAccount))
      setPendingEmail(data.pendingEmail ?? null)
      setSimpleAccountError(null)
    } catch (err) {
      console.error('Error loading settings:', err)
      setError('Fehler beim Laden der Einstellungen')
    } finally {
      setInitialLoadDone(true)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canWrite) return
    setLoading(true)
    setError(null)
    setSimpleAccountError(null)
    try {
      const response = await fetch('/api/users/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          salaryDay,
          accountName,
          transferSenderName,
          bankId,
          ...(role === 'OWNER' ? { isSimpleAccount } : {}),
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        const message =
          typeof data.error === 'string'
            ? data.error
            : 'Fehler beim Speichern der Einstellungen'
        if (response.status === 400 && role === 'OWNER' && isSimpleAccount) {
          setSimpleAccountError(message)
          setIsSimpleAccount(false)
        }
        throw new Error(message)
      }

      showToast('Einstellungen gespeichert', 'success')
      dispatchAccountChanged()
    } catch (err) {
      console.error('Error saving settings:', err)
      setError('Fehler beim Speichern der Einstellungen')
      showToast('Fehler beim Speichern der Einstellungen', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailLoading(true)
    setEmailError(null)
    try {
      const response = await fetch('/api/users/email', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newEmail,
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ein Fehler ist aufgetreten')
      }

      showToast(
        `Bestätigungs-E-Mail an ${data.pendingEmail} gesendet`,
        'success'
      )
      setPendingEmail(data.pendingEmail ?? null)
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
      const response = await fetch('/api/users/email/pending', {
        method: 'DELETE',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Abbrechen fehlgeschlagen')
      }
      setPendingEmail(null)
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
      const response = await fetch('/api/users/email/resend', {
        method: 'POST',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Senden fehlgeschlagen')
      }
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

  if (!initialLoadDone) {
    return <PageLoader message="Einstellungen werden geladen…" />
  }

  const csvImportHint = isCsvImportAvailableForBank(bankId)
    ? 'Erforderlich für den CSV-Import von Kontoumsätzen.'
    : 'Logo im Menü; für CSV-Import wird eine unterstützte Bank benötigt (z. B. DKB, ING).'

  return (
    <div className="p-6">
      <main id="settings-page" className="min-h-screen">
        <div id="settings-container" className="max-w-2xl mx-auto">
          <PageContextHeader
            title="Einstellungen"
            subtitle={`${activeAccountName} · Konto und App`}
          />

          {error && (
            <div id="error-message" className="mb-4 p-4 bg-danger-subtle text-danger rounded-lg">
              {error}
            </div>
          )}

          <div id="settings-sections" className="space-y-6">
            <AccountInvitations />

            <div id="data-management" className="rounded-lg border border-border p-4 bg-surface">
              <h2 className="text-lg font-medium text-primary mb-4">Datenverwaltung</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  href="/settings/categories"
                  className="flex items-center justify-between rounded-control border border-border px-4 py-3 text-primary hover:bg-accent-muted transition-colors duration-feedback"
                >
                  <span className="flex items-center gap-3">
                    <TagIcon className="h-5 w-5 text-accent shrink-0" aria-hidden="true" />
                    <span className="text-sm font-medium">Kategorien</span>
                  </span>
                  <ChevronRightIcon className="h-5 w-5 text-secondary shrink-0" aria-hidden="true" />
                </Link>
                <Link
                  href="/settings/merchants"
                  className="flex items-center justify-between rounded-control border border-border px-4 py-3 text-primary hover:bg-accent-muted transition-colors duration-feedback"
                >
                  <span className="flex items-center gap-3">
                    <BuildingStorefrontIcon className="h-5 w-5 text-accent shrink-0" aria-hidden="true" />
                    <span className="text-sm font-medium">Händler</span>
                  </span>
                  <ChevronRightIcon className="h-5 w-5 text-secondary shrink-0" aria-hidden="true" />
                </Link>
              </div>
            </div>

            {!canWrite && (
              <div className="rounded-lg border border-accent-border bg-accent-subtle p-4 text-sm text-primary">
                Sie haben für dieses Konto nur Lesezugriff. Einstellungen und
                Buchungen können nicht geändert werden.
              </div>
            )}

            {/* Allgemeine Einstellungen */}
            <form id="general-settings" onSubmit={handleSubmit} className="rounded-lg border border-border p-4 bg-surface">
              <h2 className="text-lg font-medium text-primary mb-4">Allgemeine Einstellungen</h2>
              
              <div className="space-y-6">
                <div>
                  <label htmlFor="accountName" className="block text-sm font-medium text-primary">
                    Kontobezeichnung
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="accountName"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      className="mt-1 block w-full rounded-control border-border shadow-sm focus:border-accent focus:ring-accent bg-surface text-primary"
                      placeholder="z.B. Girokonto"
                      disabled={loading || !canWrite}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="bankId" className="block text-sm font-medium text-primary">
                    Bank
                  </label>
                  <p className="mt-1 mb-2 text-sm text-secondary">
                    {csvImportHint}
                  </p>
                  <BankSelect
                    id="bankId"
                    value={bankId}
                    onChange={setBankId}
                    disabled={loading || !canWrite}
                  />
                </div>

                <div>
                  <label htmlFor="transferSenderName" className="block text-sm font-medium text-primary">
                    Absendername für Umbuchungen
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="transferSenderName"
                      value={transferSenderName}
                      onChange={(e) => setTransferSenderName(e.target.value)}
                      className="mt-1 block w-full rounded-control border-border shadow-sm focus:border-accent focus:ring-accent bg-surface text-primary"
                      placeholder="z.B. Martin, Familie Müller"
                      disabled={loading || !canWrite}
                    />
                  </div>
                  <p className="mt-2 text-sm text-secondary">
                    Erscheint als Händler bei eingehenden Umbuchungen in anderen Konten.
                    Wenn leer, wird die Kontobezeichnung verwendet.
                  </p>
                </div>

                {role === 'OWNER' && (
                  <div className="rounded-control border border-border p-4 bg-canvas">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="isSimpleAccount"
                        checked={isSimpleAccount}
                        onChange={(e) => {
                          setIsSimpleAccount(e.target.checked)
                          setSimpleAccountError(null)
                        }}
                        className="mt-1 h-4 w-4 rounded border-border text-accent focus:ring-accent bg-surface"
                        disabled={loading || !canWrite}
                      />
                      <div>
                        <label htmlFor="isSimpleAccount" className="block text-sm font-medium text-primary">
                          Einfaches Konto
                        </label>
                        <p className="mt-1 text-sm text-secondary">
                          Für Sparkonten, Depots oder andere Konten ohne Haushaltsplanung:
                          kein Gehaltsmonat, keine wiederkehrenden Zahlungen, vereinfachtes
                          Dashboard. Bestehende Buchungen bleiben erhalten.
                        </p>
                        {simpleAccountError && (
                          <p className="mt-2 text-sm text-danger">
                            {simpleAccountError}{' '}
                            <Link href="/recurring" className="underline font-medium">
                              Wiederkehrende Zahlungen verwalten
                            </Link>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {!isSimpleAccount && (
                <div>
                  <label htmlFor="salaryDay" className="block text-sm font-medium text-primary">
                    Tag des Gehaltseingangs
                  </label>
                  <div className="mt-1">
                    <select
                      id="salaryDay"
                      value={salaryDay}
                      onChange={(e) => setSalaryDay(parseInt(e.target.value))}
                      className="mt-1 block w-full rounded-control border-border shadow-sm focus:border-accent focus:ring-accent bg-surface text-primary"
                      disabled={loading || !canWrite}
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                        <option key={day} value={day}>
                          {day}. des Monats
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="mt-2 text-sm text-secondary">
                    Der Gehaltsmonat läuft dann vom {salaryDay}. bis zum {salaryDay}. des Folgemonats
                  </p>
                </div>
                )}

                {canWrite && (
                <div className="flex justify-end">
                  <Button type="submit" loading={loading} loadingText="Wird gespeichert…">
                    Speichern
                  </Button>
                </div>
                )}
              </div>
            </form>

            <div className="rounded-lg border border-border p-4 bg-surface">
              <h2 className="text-lg font-medium text-primary mb-4">Buchführungs-Konten</h2>
              <CreateAdditionalAccount />
              <DeleteFinancialAccount />
            </div>

            {role === 'OWNER' && (
            <div className="rounded-lg border border-border p-4 bg-surface">
              <h2 className="text-lg font-medium text-primary mb-4">Konto teilen</h2>
              <p className="text-sm text-secondary mb-4">
                Laden Sie andere Nutzer per E-Mail ein. Sie können vollen Zugriff
                oder Nur-Lese-Zugriff auf das aktuell gewählte Konto vergeben.
              </p>
              <AccountSharing />
            </div>
            )}

            {/* E-Mail-Änderung */}
            <div id="email-settings" className="rounded-lg border border-border p-4 bg-surface">
              <h2 className="text-lg font-medium text-primary mb-4">E-Mail-Adresse</h2>
              
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
                    bestätigen Sie den Link in Ihrem Postfach.
                  </p>
                  <p className="text-xs text-secondary mt-1">
                    Sie sind weiterhin mit {session?.user?.email} angemeldet, bis
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
            </div>

            <div id="appearance-settings" className="rounded-lg border border-border p-4 bg-surface">
              <h2 className="text-lg font-medium text-primary mb-2">Farbschema</h2>
              <p className="text-sm text-secondary mb-4">
                Wählen Sie ein Farbschema für die gesamte Oberfläche.
              </p>
              <ColorSchemeSwitcher />
            </div>

            {/* Backup-Manager */}
            <div id="backup-settings" className="rounded-lg border border-border p-4 bg-surface">
              <BackupManager allowRestore={canWrite} />
            </div>

            <div id="delete-user-account" className="rounded-lg border border-border p-4 bg-surface">
              <DeleteUserAccount />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 