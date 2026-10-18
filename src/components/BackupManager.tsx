'use client'

import { useState } from 'react'
import { ArrowDownTrayIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline'
import { useToast } from '@/hooks/useToast'
import { Button, getButtonClassName } from '@/components/Button'
import ConfirmDialog from '@/components/ConfirmDialog'
import { useUserSettings } from '@/hooks/useUserSettings'
import { restoreBackup } from '@/lib/api'
import { downloadBackup } from '@/lib/backupDownload'

const INVALID_FILE_MESSAGE = 'Die Datei ist kein gültiges Backup.'

export default function BackupManager({ allowRestore = true }: { allowRestore?: boolean }) {
  const { showToast } = useToast()
  const { accountName } = useUserSettings()
  const [pendingFile, setPendingFile] = useState<File | null>(null)
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

      await downloadBackup()

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

  // Erst nach Rückfrage einspielen: das Wiederherstellen ersetzt die Daten des Kontos
  const handleFileChosen = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError(null)
    setSuccess(null)
    setPendingFile(file)
  }

  const handleRestore = async () => {
    if (!pendingFile) return
    setIsRestoring(true)
    try {
      let backup: unknown
      try {
        backup = JSON.parse(await pendingFile.text())
      } catch {
        throw new Error(INVALID_FILE_MESSAGE)
      }
      await restoreBackup(backup)
      showToast('Backup wiederhergestellt', 'success')
      window.location.reload()
    } catch (err) {
      console.error('Fehler beim Wiederherstellen des Backups:', err)
      const message =
        err instanceof Error && err.message === INVALID_FILE_MESSAGE
          ? INVALID_FILE_MESSAGE
          : 'Fehler beim Wiederherstellen des Backups'
      setError(message)
      showToast(message, 'error')
    } finally {
      setIsRestoring(false)
      setPendingFile(null)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-primary mb-1">Backup & Wiederherstellung</h3>
        <p className="text-sm text-secondary">
          Sichert Buchungen, Kategorien und Händler dieses Kontos als Datei. Beim
          Wiederherstellen werden die Daten des Kontos durch das Backup ersetzt.
        </p>
      </div>

      {error && (
        <div className="rounded-control bg-danger-subtle p-4 text-sm text-danger">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-control bg-income-bg p-4 text-sm text-income">
          {success}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={handleBackup}
          disabled={isBusy}
          loading={isBackingUp}
          loadingText="Backup wird erstellt…"
        >
          <ArrowDownTrayIcon className="h-5 w-5" aria-hidden="true" />
          Backup erstellen
        </Button>

        {allowRestore && (
        <label
          className={`${getButtonClassName({ variant: 'secondary' })} cursor-pointer ${isBusy ? 'pointer-events-none opacity-50' : ''}`}
        >
          <ArrowUpTrayIcon className="h-5 w-5" aria-hidden="true" />
          Backup wiederherstellen
          <input
            type="file"
            accept=".json"
            onChange={handleFileChosen}
            disabled={isBusy}
            className="hidden"
          />
        </label>
        )}
      </div>

      <ConfirmDialog
        isOpen={pendingFile !== null}
        onClose={() => setPendingFile(null)}
        onConfirm={handleRestore}
        title="Backup wiederherstellen?"
        message={`Alle Buchungen, Kategorien und Händler von „${accountName}“ werden durch den Inhalt von „${pendingFile?.name ?? ''}“ ersetzt. Das lässt sich nicht rückgängig machen.`}
        confirmText="Wiederherstellen"
        confirmLoadingText="Wird wiederhergestellt…"
        type="danger"
      />
    </div>
  )
}
