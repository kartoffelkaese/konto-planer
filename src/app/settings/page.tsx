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
import { Button } from '@/components/Button'

export default function SettingsPage() {
  const { showToast } = useToast()
  const { data: session, update: updateSession } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [salaryDay, setSalaryDay] = useState(1)
  const [accountName, setAccountName] = useState("Mein Konto")
  
  // Neue States für E-Mail-Änderung
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailLoading, setEmailLoading] = useState(false)

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
    } catch (err) {
      console.error('Error loading settings:', err)
      setError('Fehler beim Laden der Einstellungen')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/users/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          salaryDay,
          accountName,
        }),
      })

      if (!response.ok) {
        throw new Error('Fehler beim Speichern der Einstellungen')
      }

      showToast('Einstellungen gespeichert', 'success')
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

      showToast('E-Mail-Adresse aktualisiert', 'success')
      setShowEmailForm(false)
      setNewEmail('')
      setPassword('')
      
      // Aktualisiere die Session mit der neuen E-Mail
      await updateSession({
        ...session,
        user: {
          ...session?.user,
          email: data.email,
        },
      })
    } catch (err) {
      console.error('Error updating email:', err)
      const message = err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten'
      setEmailError(message)
      showToast(message, 'error')
    } finally {
      setEmailLoading(false)
    }
  }

  return (
    <div className="p-6">
      <main id="settings-page" className="min-h-screen">
        <div id="settings-container" className="max-w-2xl mx-auto">
          <div id="page-header" className="flex justify-between items-center mb-8">
            <h1 className="page-title text-3xl">Einstellungen</h1>
          </div>

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
                      disabled={loading}
                    />
                  </div>
                </div>

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
                      disabled={loading}
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

                <div className="flex justify-end">
                  <Button type="submit" loading={loading} loadingText="Wird gespeichert…">
                    Speichern
                  </Button>
                </div>
              </div>
            </form>

            <div className="rounded-lg border border-border p-4 bg-surface">
              <h2 className="text-lg font-medium text-primary mb-4">Buchführungs-Konten</h2>
              <CreateAdditionalAccount />
              <DeleteFinancialAccount />
            </div>

            <div className="rounded-lg border border-border p-4 bg-surface">
              <h2 className="text-lg font-medium text-primary mb-4">Konto teilen</h2>
              <p className="text-sm text-secondary mb-4">
                Laden Sie andere Nutzer per E-Mail ein. Sie erhalten vollen Zugriff auf
                das aktuell gewählte Konto (Transaktionen, Kategorien, Backup).
              </p>
              <AccountSharing />
            </div>

            {/* E-Mail-Änderung */}
            <div id="email-settings" className="rounded-lg border border-border p-4 bg-surface">
              <h2 className="text-lg font-medium text-primary mb-4">E-Mail-Adresse</h2>
              
              {emailError && (
                <div className="mb-4 p-4 bg-danger-subtle text-danger rounded-lg">
                  {emailError}
                </div>
              )}

              {!showEmailForm ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-secondary">Aktuelle E-Mail-Adresse</p>
                    <p className="font-medium text-primary">{session?.user?.email}</p>
                  </div>
                  <Button type="button" variant="ghost" onClick={() => setShowEmailForm(true)}>
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
                    <Button type="submit" loading={emailLoading} loadingText="Wird gespeichert…">
                      Speichern
                    </Button>
                  </div>
                </form>
              )}
            </div>

            <div id="appearance-settings" className="rounded-lg border border-border p-4 bg-surface">
              <h2 className="text-lg font-medium text-primary mb-2">Farbschema</h2>
              <p className="text-sm text-secondary mb-4">
                Nebel &amp; Veilchen (Standard) oder Abendlicht
              </p>
              <ColorSchemeSwitcher />
            </div>

            {/* Backup-Manager */}
            <div id="backup-settings" className="rounded-lg border border-border p-4 bg-surface">
              <BackupManager />
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