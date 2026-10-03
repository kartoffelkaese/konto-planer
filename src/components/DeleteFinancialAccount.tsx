'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { TrashIcon } from '@heroicons/react/24/outline'
import { useToast } from '@/hooks/useToast'
import { useApiQuery } from '@/hooks/useApiQuery'
import { useUserSettings } from '@/hooks/useUserSettings'
import { Button } from '@/components/Button'
import {
  ACCOUNT_SWITCH_EXIT_MS,
  dispatchAccountChanged,
  dispatchAccountSwitching,
} from '@/lib/accountSwitchEvents'
import { deleteAccount, getAccounts, withApiErrorFallback } from '@/lib/api'

export default function DeleteFinancialAccount() {
  const router = useRouter()
  const { update } = useSession()
  const { showToast } = useToast()
  const { settings } = useUserSettings()
  const accountName = settings?.accountName ?? 'Mein Konto'
  const accountId = settings?.activeAccountId ?? null
  const role = settings?.role ?? null
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmName, setConfirmName] = useState('')

  // Anzahl der eigenen Konten (Fehler still übergehen, dann 0 wie bisher)
  const { data: accounts, reload: load } = useApiQuery('accounts-count', () => getAccounts<unknown>())
  const accountCount = Array.isArray(accounts) ? accounts.length : 0

  useEffect(() => {
    window.addEventListener('account-changed', load)
    return () => window.removeEventListener('account-changed', load)
  }, [load])

  const handleDelete = async () => {
    if (!accountId) return
    if (confirmName.trim() !== accountName.trim()) {
      setError(`Bitte gib exakt „${accountName}" ein`)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await withApiErrorFallback(deleteAccount(accountId), 'Löschen fehlgeschlagen')

      if (data.nextAccountId) {
        dispatchAccountSwitching()
        await new Promise((resolve) => setTimeout(resolve, ACCOUNT_SWITCH_EXIT_MS))
        await update({ activeAccountId: data.nextAccountId })
      }

      showToast('Buchführungs-Konto gelöscht', 'success')
      setShowConfirm(false)
      setConfirmName('')
      router.refresh()
      dispatchAccountChanged()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Löschen fehlgeschlagen'
      setError(message)
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  if (role !== 'OWNER') {
    return (
      <p className="text-sm text-secondary border-t border-border pt-4 mt-4">
        Nur der <span className="font-medium text-primary">Inhaber</span> kann das
        aktuelle Buchführungs-Konto löschen. Du bist als Mitglied eingeladen.
      </p>
    )
  }

  if (accountCount <= 1) {
    return (
      <p className="text-sm text-secondary border-t border-border pt-4 mt-4">
        Dies ist dein einziges Buchführungs-Konto. Um den Zugang vollständig zu
        entfernen, nutze unten{' '}
        <span className="font-medium text-primary">Anmeldung löschen</span>.
      </p>
    )
  }

  return (
    <div className="border-t border-border pt-4 mt-4 space-y-3">
      <h3 className="text-sm font-medium text-primary">Aktuelles Konto löschen</h3>
      <p className="text-sm text-secondary">
        Löscht nur das Buchführungs-Konto{' '}
        <span className="font-medium text-primary">„{accountName}"</span> mit allen
        Transaktionen, Kategorien und Händlern. Deine Anmeldung und andere Konten
        bleiben erhalten. Danach wechselst du automatisch zu einem anderen Konto.
      </p>

      {error && (
        <div className="p-3 bg-danger-subtle text-danger rounded-control text-sm">
          {error}
        </div>
      )}

      {!showConfirm ? (
        <Button
          type="button"
          variant="danger-outline"
          onClick={() => {
            setShowConfirm(true)
            setError(null)
          }}
        >
          <TrashIcon className="h-5 w-5" aria-hidden />
          Buchführungs-Konto „{accountName}" löschen
        </Button>
      ) : (
        <div className="space-y-3">
          <div>
            <label htmlFor="confirm-account-name" className="block text-sm font-medium text-primary">
              Zur Bestätigung den Kontonamen eingeben:{' '}
              <span className="text-danger">{accountName}</span>
            </label>
            <input
              id="confirm-account-name"
              type="text"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              className="mt-1 block w-full rounded-control border-border shadow-sm focus:border-danger focus:ring-danger bg-surface text-primary"
              disabled={loading}
              autoComplete="off"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowConfirm(false)
                setConfirmName('')
                setError(null)
              }}
              disabled={loading}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              disabled={confirmName.trim() !== accountName.trim()}
              loading={loading}
              loadingText="Wird gelöscht…"
            >
              Endgültig löschen
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
