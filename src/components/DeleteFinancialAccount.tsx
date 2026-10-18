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

/** Karte „Konto löschen“ in den Einstellungen (Bereich des aktuellen Kontos) */
function DeleteAccountCard({ children }: { children: React.ReactNode }) {
  return (
    <div id="delete-financial-account" className="card p-4 md:p-5">
      <h3 className="text-lg font-semibold text-primary mb-1">Konto löschen</h3>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

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
      setError(`Bitte gib exakt „${accountName}“ ein`)
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
      <DeleteAccountCard>
        <p className="text-sm text-secondary">
          Nur der <span className="font-medium text-primary">Inhaber</span> kann dieses
          Buchführungs-Konto löschen. Du bist als Mitglied eingeladen.
        </p>
      </DeleteAccountCard>
    )
  }

  if (accountCount <= 1) {
    return (
      <DeleteAccountCard>
        <p className="text-sm text-secondary">
          Dies ist dein einziges Buchführungs-Konto. Um den Zugang vollständig zu
          entfernen, nutze unten{' '}
          <span className="font-medium text-primary">Anmeldung löschen</span>.
        </p>
      </DeleteAccountCard>
    )
  }

  return (
    <DeleteAccountCard>
      <p className="text-sm text-secondary">
        Löscht nur das Buchführungs-Konto{' '}
        <span className="font-medium text-primary">„{accountName}“</span> mit allen
        Buchungen, Kategorien und Händlern. Deine Anmeldung und andere Konten
        bleiben erhalten. Danach wechselst du automatisch zu einem anderen Konto.
      </p>

      {error && (
        <div className="rounded-control bg-danger-subtle p-4 text-sm text-danger">
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
          Buchführungs-Konto „{accountName}“ löschen
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
              className="mt-1 block w-full"
              disabled={loading}
              autoComplete="off"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
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
    </DeleteAccountCard>
  )
}
