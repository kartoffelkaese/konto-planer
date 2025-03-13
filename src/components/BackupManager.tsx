'use client'

import { useState } from 'react'
import { ArrowDownTrayIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline'

export default function BackupManager() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleBackup = async () => {
    try {
      setIsLoading(true)
      setError(null)
      setSuccess(null)

      const response = await fetch('/api/backup')
      if (!response.ok) throw new Error('Fehler beim Erstellen des Backups')

      const backup = await response.json()
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `konto-planer-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setSuccess('Backup erfolgreich erstellt')
    } catch (err) {
      console.error('Fehler beim Erstellen des Backups:', err)
      setError('Fehler beim Erstellen des Backups')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setIsLoading(true)
      setError(null)
      setSuccess(null)

      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const backup = JSON.parse(e.target?.result as string)
          const response = await fetch('/api/backup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(backup)
          })

          if (!response.ok) throw new Error('Fehler beim Wiederherstellen des Backups')

          setSuccess('Backup erfolgreich wiederhergestellt')
          window.location.reload()
        } catch (err) {
          console.error('Fehler beim Wiederherstellen des Backups:', err)
          setError('Fehler beim Wiederherstellen des Backups')
        } finally {
          setIsLoading(false)
        }
      }
      reader.readAsText(file)
    } catch (err) {
      console.error('Fehler beim Lesen der Datei:', err)
      setError('Fehler beim Lesen der Datei')
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Backup & Wiederherstellung</h3>
      <p className="text-sm text-gray-500">
        Erstellen Sie ein Backup Ihrer Daten oder stellen Sie ein vorheriges Backup wieder her.
      </p>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 text-green-700 rounded-lg">
          {success}
        </div>
      )}

      <div className="flex space-x-4">
        <button
          onClick={handleBackup}
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
          Backup erstellen
        </button>

        <label className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 cursor-pointer">
          <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
          Backup wiederherstellen
          <input
            type="file"
            accept=".json"
            onChange={handleRestore}
            disabled={isLoading}
            className="hidden"
          />
        </label>
      </div>
    </div>
  )
} 