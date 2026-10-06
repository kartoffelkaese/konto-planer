'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { TagIcon, BuildingStorefrontIcon, ChevronRightIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import BackupManager from '@/components/BackupManager'
import DeleteFinancialAccount from '@/components/DeleteFinancialAccount'
import DeleteUserAccount from '@/components/DeleteUserAccount'
import { useToast } from '@/hooks/useToast'
import ColorSchemeSwitcher from '@/components/ColorSchemeSwitcher'
import EmailSettingsSection from '@/components/settings/EmailSettingsSection'
import AccountSharing from '@/components/AccountSharing'
import PlanSection from '@/components/settings/PlanSection'
import AccountInvitations from '@/components/AccountInvitations'
import CreateAdditionalAccount from '@/components/CreateAdditionalAccount'
import BankSelect from '@/components/BankSelect'
import PageContextHeader from '@/components/PageContextHeader'
import PageLoader from '@/components/PageLoader'
import { useUserSettings } from '@/hooks/useUserSettings'
import { isCsvImportAvailableForBank } from '@/lib/csvImport/bankFormats'
import { Button } from '@/components/Button'
import { dispatchAccountChanged } from '@/lib/accountSwitchEvents'
import {
  ApiError,
  getApiErrorMessage,
  getUserSettings,
  updateUserSettings,
  withApiErrorFallback,
} from '@/lib/api'

export default function SettingsPage() {
  const { showToast } = useToast()
  const {
    canWrite,
    role,
    accountName: activeAccountName,
  } = useUserSettings()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [salaryDay, setSalaryDay] = useState(1)
  const [accountName, setAccountName] = useState("Mein Konto")
  const [transferSenderName, setTransferSenderName] = useState('')
  const [splitDisplayName, setSplitDisplayName] = useState('')
  const [splitProfileLoading, setSplitProfileLoading] = useState(false)
  const [bankId, setBankId] = useState<string | null>(null)
  const [isSimpleAccount, setIsSimpleAccount] = useState(false)
  const [simpleAccountError, setSimpleAccountError] = useState<string | null>(null)
  // Neue States für E-Mail-Änderung
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [initialLoadDone, setInitialLoadDone] = useState(false)

  // Das Formular lädt seine Werte selbst (nicht aus dem Provider), damit eine
  // Hintergrund-Aktualisierung keine laufenden Eingaben überschreibt
  const loadSettings = useCallback(
    () =>
      getUserSettings()
        .then(
          (data) => {
            setSalaryDay(data.salaryDay)
            setAccountName(data.accountName || 'Mein Konto')
            setTransferSenderName(data.transferSenderName || '')
            setSplitDisplayName(data.splitDisplayName || '')
            setBankId(data.bankId ?? null)
            setIsSimpleAccount(Boolean(data.isSimpleAccount))
            setPendingEmail(data.pendingEmail ?? null)
            setSimpleAccountError(null)
          },
          (err: unknown) => {
            // 404 ist OK, bedeutet nur dass noch keine Einstellungen existieren
            if (err instanceof ApiError && err.status === 404) return
            console.error('Error loading settings:', new Error('Fehler beim Laden der Einstellungen'))
            setError('Fehler beim Laden der Einstellungen')
          }
        )
        .finally(() => setInitialLoadDone(true)),
    []
  )

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  useEffect(() => {
    const onAccountChanged = () => void loadSettings()
    window.addEventListener('account-changed', onAccountChanged)
    return () => window.removeEventListener('account-changed', onAccountChanged)
  }, [loadSettings])

  const handleSplitProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSplitProfileLoading(true)
    setError(null)
    try {
      await withApiErrorFallback(
        updateUserSettings({ splitDisplayName }),
        'Fehler beim Speichern'
      )
      showToast('Split-Anzeigename gespeichert', 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fehler beim Speichern'
      setError(message)
      showToast(message, 'error')
    } finally {
      setSplitProfileLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canWrite) return
    setLoading(true)
    setError(null)
    setSimpleAccountError(null)
    try {
      try {
        await updateUserSettings({
          salaryDay,
          accountName,
          transferSenderName,
          bankId,
          ...(role === 'OWNER' ? { isSimpleAccount } : {}),
        })
      } catch (err) {
        const message = getApiErrorMessage(err, 'Fehler beim Speichern der Einstellungen')
        if (
          err instanceof ApiError &&
          err.status === 400 &&
          role === 'OWNER' &&
          isSimpleAccount
        ) {
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

            {!canWrite && (
              <div className="rounded-lg border border-accent-border bg-accent-subtle p-4 text-sm text-primary">
                Du hast für dieses Konto nur Lesezugriff. Einstellungen und
                Buchungen können nicht geändert werden.
              </div>
            )}

            <PlanSection />

            <div id="data-management" className="card p-4 md:p-5">
              <h2 className="text-lg font-medium text-primary mb-1">Datenverwaltung</h2>
              <p className="text-sm text-secondary mb-4">
                Kategorien und Händler für {activeAccountName}
              </p>
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

            <form id="general-settings" onSubmit={handleSubmit} className="card p-4 md:p-5">
              <h2 className="text-lg font-medium text-primary mb-1">Aktuelles Konto</h2>
              <p className="text-sm text-secondary mb-4">
                Einstellungen für {activeAccountName}
              </p>
              
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
                          kein Gehaltsmonat, keine wiederkehrenden Zahlungen, vereinfachte
                          Übersicht. Bestehende Buchungen bleiben erhalten.
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

                {canWrite && (
                <div className="flex justify-end">
                  <Button type="submit" loading={loading} loadingText="Wird gespeichert…">
                    Speichern
                  </Button>
                </div>
                )}
              </div>
            </form>

            {role === 'OWNER' && (
            <div className="card p-4 md:p-5">
              <h2 className="text-lg font-medium text-primary mb-4">Konto teilen</h2>
              <p className="text-sm text-secondary mb-4">
                Lade andere Nutzer per E-Mail ein. Du kannst vollen Zugriff
                oder Nur-Lese-Zugriff auf das aktuell gewählte Konto vergeben.
              </p>
              <AccountSharing />
            </div>
            )}

            <div className="card p-4 md:p-5">
              <h2 className="text-lg font-medium text-primary mb-1">Weitere Konten</h2>
              <p className="text-sm text-secondary mb-4">
                Zusätzliche Buchführungs-Konten anlegen oder entfernen
              </p>
              <CreateAdditionalAccount />
              <DeleteFinancialAccount />
            </div>

            <form
              onSubmit={handleSplitProfileSubmit}
              className="card p-4 md:p-5"
            >
              <div className="mb-4 flex items-start gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-accent-border bg-accent-subtle text-accent">
                  <UserGroupIcon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-lg font-medium text-primary">Profil & Split</h2>
                  <p className="mt-1 text-sm text-secondary">
                    Gilt für alle Konten — unabhängig vom Kontowechsel
                  </p>
                </div>
              </div>
              <div>
                <label htmlFor="splitDisplayName" className="block text-sm font-medium text-primary">
                  Anzeigename in Split-Listen
                </label>
                <input
                  type="text"
                  id="splitDisplayName"
                  value={splitDisplayName}
                  onChange={(e) => setSplitDisplayName(e.target.value)}
                  className="mt-1 block w-full rounded-control border-border shadow-sm focus:border-accent focus:ring-accent bg-surface text-primary"
                  placeholder="z. B. Martin"
                  disabled={splitProfileLoading}
                />
                <p className="mt-2 text-sm text-secondary">
                  Wird beim Anlegen neuer Listen oder beim Beitreten per Einladung verwendet.
                  Bestehende Namen in Listen bleiben unverändert.
                </p>
              </div>
              <div className="mt-4">
                <Button type="submit" loading={splitProfileLoading} loadingText="Speichern…" size="sm">
                  Split-Namen speichern
                </Button>
              </div>
            </form>

            <EmailSettingsSection
              pendingEmail={pendingEmail}
              onPendingEmailChange={setPendingEmail}
            />

            <div id="appearance-settings" className="card p-4 md:p-5">
              <h2 className="text-lg font-medium text-primary mb-1">Darstellung</h2>
              <p className="text-sm text-secondary mb-4">
                Hell, Dunkel oder automatisch wie im Betriebssystem
              </p>
              <ColorSchemeSwitcher />
            </div>

            <div id="backup-settings" className="card p-4 md:p-5">
              <BackupManager allowRestore={canWrite} />
            </div>

            <div id="delete-user-account" className="card p-4 md:p-5">
              <DeleteUserAccount />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 