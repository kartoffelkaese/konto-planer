'use client'

import { useState } from 'react'
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/Button'
import Modal from '@/components/Modal'
import { useToast } from '@/hooks/useToast'
import { exportUserData, getApiErrorMessage } from '@/lib/api'
import { downloadBlob } from '@/lib/backupDownload'
import { formatDateForInput } from '@/lib/dateUtils'

/** Einstellungen → „Meine Daten herunterladen“: Export nach DSGVO als ZIP, nur mit Passwort */
export default function DataExportCard() {
  const { showToast } = useToast()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const close = () => {
    if (loading) return
    setOpen(false)
    setPassword('')
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) {
      setError('Bitte gib dein Passwort ein')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const blob = await exportUserData(password)
      downloadBlob(blob, `kontoplaner-daten-${formatDateForInput(new Date())}.zip`)
      showToast('Deine Daten wurden heruntergeladen', 'success')
      setOpen(false)
      setPassword('')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Der Export ist fehlgeschlagen. Bitte versuche es erneut.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card p-4 md:p-5 space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-primary mb-1">Meine Daten herunterladen</h3>
        <p className="text-sm text-secondary">
          Alle Daten, die KontoPlaner über dich speichert, als ZIP-Datei: eine Übersicht zum Lesen
          im Browser, Tabellen für Excel und eine Datei für andere Programme. Die Datei enthält
          deine Finanzdaten – bewahre sie sicher auf.
        </p>
      </div>

      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <ArrowDownTrayIcon className="h-5 w-5" aria-hidden="true" />
        Daten herunterladen
      </Button>

      <Modal isOpen={open} onClose={close} title="Meine Daten herunterladen" maxWidth="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-secondary">
            Bitte bestätige den Download mit deinem Passwort.
          </p>
          <div>
            <label htmlFor="data-export-password" className="block text-sm font-medium text-primary">
              Passwort
            </label>
            <input
              id="data-export-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={loading}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'data-export-error' : undefined}
              className="mt-1 block w-full"
            />
            {error && (
              <p id="data-export-error" className="mt-1 text-sm text-danger">
                {error}
              </p>
            )}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={close} disabled={loading}>
              Abbrechen
            </Button>
            <Button type="submit" loading={loading} loadingText="Wird erstellt…">
              Herunterladen
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
