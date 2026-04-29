'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import BackupManager from '@/components/BackupManager'
import DeleteAccount from '@/components/DeleteAccount'
import ThemeSwitcher from '@/components/ThemeSwitcher'

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [salaryDay, setSalaryDay] = useState(1)
  const [accountName, setAccountName] = useState("Mein Konto")
  
  // Neue States für E-Mail-Änderung
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailSuccess, setEmailSuccess] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)

  useEffect(() => {
    loadSettings()
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
    setSuccess(false)

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

      setSuccess(true)
    } catch (err) {
      console.error('Error saving settings:', err)
      setError('Fehler beim Speichern der Einstellungen')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailLoading(true)
    setEmailError(null)
    setEmailSuccess(false)

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

      setEmailSuccess(true)
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
      setEmailError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
    } finally {
      setEmailLoading(false)
    }
  }

  return (
    <div className="p-6">
      <main id="settings-page" className="min-h-screen">
        <div id="settings-container" className="max-w-2xl mx-auto">
          <div id="page-header" className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Einstellungen</h1>
          </div>

          {error && (
            <div id="error-message" className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-200 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div id="success-message" className="mb-4 p-4 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-200 rounded-lg">
              Einstellungen wurden erfolgreich gespeichert
            </div>
          )}

          <div id="settings-sections" className="space-y-6">
            {/* Allgemeine Einstellungen */}
            <form id="general-settings" onSubmit={handleSubmit} className="rounded-lg shadow-md p-4 bg-white dark:bg-dark-light">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Allgemeine Einstellungen</h2>
              
              <div className="space-y-6">
                <div>
                  <label htmlFor="accountName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Kontobezeichnung
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="accountName"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder="z.B. Girokonto"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="salaryDay" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Tag des Gehaltseingangs
                  </label>
                  <div className="mt-1">
                    <select
                      id="salaryDay"
                      value={salaryDay}
                      onChange={(e) => setSalaryDay(parseInt(e.target.value))}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      disabled={loading}
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                        <option key={day} value={day}>
                          {day}. des Monats
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Der Gehaltsmonat läuft dann vom {salaryDay}. bis zum {salaryDay}. des Folgemonats
                  </p>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md disabled:opacity-50"
                    disabled={loading}
                  >
                    {loading ? 'Speichern...' : 'Speichern'}
                  </button>
                </div>
              </div>
            </form>

            {/* E-Mail-Änderung */}
            <div id="email-settings" className="rounded-lg shadow-md p-4 bg-white dark:bg-dark-light">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">E-Mail-Adresse</h2>
              
              {emailError && (
                <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-200 rounded-lg">
                  {emailError}
                </div>
              )}

              {emailSuccess && (
                <div className="mb-4 p-4 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-200 rounded-lg">
                  E-Mail-Adresse wurde erfolgreich aktualisiert
                </div>
              )}

              {!showEmailForm ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Aktuelle E-Mail-Adresse</p>
                    <p className="font-medium text-gray-900 dark:text-white">{session?.user?.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowEmailForm(true)}
                    className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Ändern
                  </button>
                </div>
              ) : (
                <form onSubmit={handleEmailChange} className="space-y-4">
                  <div>
                    <label htmlFor="newEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Neue E-Mail-Adresse
                    </label>
                    <input
                      type="email"
                      id="newEmail"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      required
                      disabled={emailLoading}
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Passwort
                    </label>
                    <input
                      type="password"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      required
                      disabled={emailLoading}
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowEmailForm(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md shadow-sm disabled:opacity-50"
                      disabled={emailLoading}
                    >
                      {emailLoading ? 'Speichern...' : 'Speichern'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Theme-Einstellungen */}
            <div id="theme-settings" className="rounded-lg shadow-md p-4 bg-white dark:bg-dark-light">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Erscheinungsbild</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Theme-Modus</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Wählen Sie zwischen hellem und dunklem Erscheinungsbild</p>
                </div>
                <ThemeSwitcher />
              </div>
            </div>

            {/* Backup-Manager */}
            <div id="backup-settings" className="rounded-lg shadow-md p-4 bg-white dark:bg-dark-light">
              <BackupManager />
            </div>

            {/* Konto löschen */}
            <div id="delete-account" className="rounded-lg shadow-md p-4 bg-white dark:bg-dark-light">
              <DeleteAccount />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 