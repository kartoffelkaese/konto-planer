'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { TrashIcon } from '@heroicons/react/24/outline'
import { useToast } from '@/hooks/useToast'
import { Button } from '@/components/Button'
import {
  ACCOUNT_SWITCH_EXIT_MS,
  dispatchAccountChanged,
  dispatchAccountSwitching,
} from '@/lib/accountSwitchEvents'

export default function DeleteFinancialAccount() {
  const router = useRouter()
  const { update } = useSession()
  const { showToast } = useToast()
  const [accountName, setAccountName] = useState('')
  const [accountId, setAccountId] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [accountCount, setAccountCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmName, setConfirmName] = useState('')

  const load = useCallback(async () => {
    try {
      const [settingsRes, accountsRes] = await Promise.all([
        fetch('/api/users/settings'),
        fetch('/api/accounts'),
      ])
      if (settingsRes.ok) {
        const settings = await settingsRes.json()
        setAccountName(settings.accountName ?? 'Mein Konto')
        setAccountId(settings.activeAccountId ?? null)
        setRole(settings.role ?? null)
      }
      if (accountsRes.ok) {
        const accounts = await accountsRes.json()
        setAccountCount(Array.isArray(accounts) ? accounts.length : 0)
      }
    } catch {
      // optional
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const onAccountChanged = () => load()
    window.addEventListener('account-changed', onAccountChanged)
    return () => window.removeEventListener('account-changed', onAccountChanged)
  }, [load])

  const handleDelete = async () => {
    if (!accountId) return
    if (confirmName.trim() !== accountName.trim()) {
      setError(`Bitte geben Sie exakt „${accountName}" ein`)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/accounts/${accountId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Löschen fehlgeschlagen')
      }

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
        aktuelle Buchführungs-Konto löschen. Sie sind als Mitglied eingeladen.
      </p>
    )
  }

  if (accountCount <= 1) {
    return (
      <p className="text-sm text-secondary border-t border-border pt-4 mt-4">
        Dies ist Ihr einziges Buchführungs-Konto. Um den Zugang vollständig zu
        entfernen, nutzen Sie unten{' '}
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
        Transaktionen, Kategorien und Händlern. Ihre Anmeldung und andere Konten
        bleiben erhalten. Danach wechseln Sie automatisch zu einem anderen Konto.
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
