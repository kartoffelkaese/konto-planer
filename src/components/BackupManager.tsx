'use client'

import { useState } from 'react'
import { ArrowDownTrayIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline'
import { useToast } from '@/hooks/useToast'
import { Button, getButtonClassName } from '@/components/Button'

export default function BackupManager() {
  const { showToast } = useToast()
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const isBusy = isBackingUp || isRestoring
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleBackup = async () => {
    try {
      setIsBackingUp(true)
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
      showToast('Backup erfolgreich erstellt', 'success')
    } catch (err) {
      console.error('Fehler beim Erstellen des Backups:', err)
      setError('Fehler beim Erstellen des Backups')
      showToast('Fehler beim Erstellen des Backups', 'error')
    } finally {
      setIsBackingUp(false)
    }
  }

  const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setIsRestoring(true)
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
          showToast('Backup erfolgreich wiederhergestellt', 'success')
          window.location.reload()
        } catch (err) {
          console.error('Fehler beim Wiederherstellen des Backups:', err)
          setError('Fehler beim Wiederherstellen des Backups')
          showToast('Fehler beim Wiederherstellen des Backups', 'error')
        } finally {
          setIsRestoring(false)
        }
      }
      reader.readAsText(file)
    } catch (err) {
      console.error('Fehler beim Lesen der Datei:', err)
      setError('Fehler beim Lesen der Datei')
      setIsRestoring(false)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-primary">Backup & Wiederherstellung</h3>
      <p className="text-sm text-secondary">
        Erstellen Sie ein Backup Ihrer Daten oder stellen Sie ein vorheriges Backup wieder her.
      </p>

      {error && (
        <div className="p-4 bg-danger-subtle text-danger rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-income-bg text-income rounded-lg">
          {success}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={handleBackup}
          disabled={isBusy}
          loading={isBackingUp}
          loadingText="Backup wird erstellt…"
        >
          <ArrowDownTrayIcon className="h-5 w-5" aria-hidden="true" />
          Backup erstellen
        </Button>

        <label
          className={`${getButtonClassName({ variant: 'primary' })} cursor-pointer ${isBusy ? 'pointer-events-none opacity-50' : ''}`}
        >
          {isRestoring ? (
            <>
              <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
              Wird wiederhergestellt…
            </>
          ) : (
            <>
              <ArrowUpTrayIcon className="h-5 w-5" aria-hidden="true" />
              Backup wiederherstellen
            </>
          )}
          <input
            type="file"
            accept=".json"
            onChange={handleRestore}
            disabled={isBusy}
            className="hidden"
          />
        </label>
      </div>
    </div>
  )
} 