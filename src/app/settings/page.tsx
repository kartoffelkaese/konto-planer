'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

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
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Einstellungen</h1>
          <Link
            href="/transactions"
            className="text-gray-600 hover:text-gray-800"
          >
            Zurück zur Übersicht
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-lg">
            Einstellungen wurden erfolgreich gespeichert
          </div>
        )}

        <div className="space-y-6">
          {/* E-Mail-Änderung */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">E-Mail-Adresse</h2>
            
            {emailError && (
              <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
                {emailError}
              </div>
            )}

            {emailSuccess && (
              <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-lg">
                E-Mail-Adresse wurde erfolgreich aktualisiert
              </div>
            )}

            {!showEmailForm ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Aktuelle E-Mail-Adresse</p>
                  <p className="font-medium">{session?.user?.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEmailForm(true)}
                  className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Ändern
                </button>
              </div>
            ) : (
              <form onSubmit={handleEmailChange} className="space-y-4">
                <div>
                  <label htmlFor="newEmail" className="block text-sm font-medium text-gray-700">
                    Neue E-Mail-Adresse
                  </label>
                  <input
                    type="email"
                    id="newEmail"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                    disabled={emailLoading}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Aktuelles Passwort
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                    disabled={emailLoading}
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmailForm(false)
                      setNewEmail('')
                      setPassword('')
                      setEmailError(null)
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                    disabled={emailLoading}
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                    disabled={emailLoading}
                  >
                    {emailLoading ? 'Wird gespeichert...' : 'Speichern'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Allgemeine Einstellungen */}
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-4 mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Allgemeine Einstellungen</h2>
            
            <div className="space-y-6">
              <div>
                <label htmlFor="accountName" className="block text-sm font-medium text-gray-700">
                  Kontobezeichnung
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="accountName"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="z.B. Girokonto"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="salaryDay" className="block text-sm font-medium text-gray-700">
                  Tag des Gehaltseingangs
                </label>
                <div className="mt-1">
                  <select
                    id="salaryDay"
                    value={salaryDay}
                    onChange={(e) => setSalaryDay(parseInt(e.target.value))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    disabled={loading}
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <option key={day} value={day}>
                        {day}. des Monats
                      </option>
                    ))}
                  </select>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Der Gehaltsmonat läuft dann vom {salaryDay}. bis zum {salaryDay}. des Folgemonats
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Speichern...' : 'Speichern'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
} 