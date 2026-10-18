'use client'

import { useState } from 'react'
import { ArrowDownTrayIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/Button'
import Modal from '@/components/Modal'
import SegmentedControl from '@/components/SegmentedControl'
import { useApiQuery } from '@/hooks/useApiQuery'
import { useToast } from '@/hooks/useToast'
import { useUserSettings } from '@/hooks/useUserSettings'
import { dispatchAccountChanged } from '@/lib/accountSwitchEvents'
import { getApiErrorMessage, getResettableAccounts, resetAccounts } from '@/lib/api'
import { downloadBackup } from '@/lib/backupDownload'
import { formatNumber } from '@/lib/formatters'
import { RESET_ALL_CONFIRM_TEXT, type ResetLevel, type ResettableAccount } from '@/lib/accountResetShared'

type Scope = 'current' | 'all'

const count = (value: number, one: string, many: string) =>
  `${formatNumber(value, 0)} ${value === 1 ? one : many}`

/** Was eine Stufe löscht – für Kachel, Zusammenfassung und Meldung */
function levelParts(level: ResetLevel, totals: Omit<ResettableAccount, 'id' | 'name'>) {
  const parts = [count(totals.transactions, 'Buchung', 'Buchungen')]
  if (level !== 'transactions') parts.push(count(totals.recurring, 'wiederkehrende Zahlung', 'wiederkehrende Zahlungen'))
  if (level === 'everything') {
    parts.push(count(totals.categories, 'Kategorie', 'Kategorien'), count(totals.merchants, 'Händler', 'Händler'))
  }
  return parts
}

const LEVELS: { value: ResetLevel; label: string; description: string }[] = [
  {
    value: 'transactions',
    label: 'Nur Buchungen',
    description: 'Wiederkehrende Zahlungen, Kategorien und Händler bleiben.',
  },
  {
    value: 'recurring',
    label: 'Buchungen und wiederkehrende Zahlungen',
    description: 'Kategorien und Händler bleiben.',
  },
  {
    value: 'everything',
    label: 'Alles',
    description: 'Zusätzlich alle Kategorien und Händler – wie ein neu angelegtes Konto.',
  },
]

function ResetAccountDialog({ onClose }: { onClose: () => void }) {
  const { showToast } = useToast()
  const { data, error: loadError } = useApiQuery('resettable-accounts', getResettableAccounts)
  const [scope, setScope] = useState<Scope>('current')
  const [level, setLevel] = useState<ResetLevel>('transactions')
  const [confirmText, setConfirmText] = useState('')
  const [saving, setSaving] = useState(false)
  const [backupId, setBackupId] = useState<string | null>(null)

  const accounts = data?.accounts ?? []
  const current = accounts.find((account) => account.id === data?.activeAccountId)
  const targets = scope === 'all' ? accounts : current ? [current] : []
  const totals = targets.reduce(
    (sum, a) => ({
      transactions: sum.transactions + a.transactions,
      recurring: sum.recurring + a.recurring,
      categories: sum.categories + a.categories,
      merchants: sum.merchants + a.merchants,
    }),
    { transactions: 0, recurring: 0, categories: 0, merchants: 0 }
  )
  const expected = scope === 'all' ? RESET_ALL_CONFIRM_TEXT : (current?.name ?? '')
  const confirmed = expected !== '' && confirmText.trim() === expected.trim()

  const handleBackup = async (account: ResettableAccount) => {
    setBackupId(account.id)
    try {
      await downloadBackup(account.id, account.name)
      showToast(`Backup von „${account.name}“ heruntergeladen`, 'success')
    } catch {
      showToast('Backup konnte nicht erstellt werden', 'error')
    } finally {
      setBackupId(null)
    }
  }

  const handleReset = async () => {
    setSaving(true)
    try {
      const result = await resetAccounts({ scope, level, confirmText })
      // In der Meldung nur, was tatsächlich gelöscht wurde
      const deleted = levelParts(level, result)
        .filter((part) => !part.startsWith('0 '))
        .join(', ')
      const prefix = result.accounts > 1 ? `${result.accounts} Konten zurückgesetzt` : 'Konto zurückgesetzt'
      showToast(deleted ? `${prefix}: ${deleted} gelöscht` : `${prefix} – es gab nichts zu löschen`, 'success')
      dispatchAccountChanged()
      onClose()
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Zurücksetzen fehlgeschlagen'), 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loadError) {
    return <p className="text-sm text-danger">Die Konten konnten nicht geladen werden.</p>
  }
  if (!data) {
    return <p className="text-sm text-secondary">Wird geladen…</p>
  }
  if (!current) {
    return <p className="text-sm text-secondary">Nur der Inhaber kann dieses Konto zurücksetzen.</p>
  }

  return (
    <div className="space-y-5">
      {accounts.length > 1 && (
        <div className="space-y-2">
          <p className="eyebrow">Welche Konten?</p>
          <SegmentedControl
            ariaLabel="Welche Konten zurücksetzen"
            className="grid w-full grid-cols-2"
            options={[
              { value: 'current', label: `Nur „${current.name}“`, shortLabel: 'Nur dieses' },
              { value: 'all', label: `Alle eigenen Konten (${accounts.length})`, shortLabel: `Alle (${accounts.length})` },
            ]}
            value={scope}
            onChange={(value) => {
              setScope(value)
              setConfirmText('')
            }}
            disabled={saving}
          />
        </div>
      )}

      <div className="space-y-2">
        <p className="eyebrow">Was soll gelöscht werden?</p>
        <div className="space-y-2" role="radiogroup" aria-label="Was soll gelöscht werden">
          {LEVELS.map((option) => (
            <label
              key={option.value}
              className="flex items-start gap-3 rounded-control bg-surface-muted p-3 text-sm text-primary transition-colors duration-feedback has-[:checked]:bg-accent-subtle"
            >
              <input
                type="radio"
                name="reset-level"
                value={option.value}
                checked={level === option.value}
                onChange={() => setLevel(option.value)}
                disabled={saving}
                className="mt-0.5 h-4 w-4 shrink-0 border-border text-accent"
              />
              <span>
                <span className="block font-medium">{option.label}</span>
                <span className="block text-secondary">{option.description}</span>
                <span className="mt-1 block text-xs text-secondary">
                  {levelParts(option.value, totals).join(' · ')}
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-control bg-danger-subtle p-4 text-sm text-primary">
        <p>
          <span className="font-medium text-danger">Gelöscht werden:</span> {levelParts(level, totals).join(', ')}
          {targets.length > 1 ? ` in ${targets.length} Konten` : ''}.
        </p>
        <p className="mt-1 text-secondary">
          Kontoname, Bank, Gehaltstag, Mitglieder und Split-Listen bleiben. Umbuchungen in anderen
          Konten bleiben dort stehen. Das lässt sich nicht rückgängig machen.
        </p>
      </div>

      <div className="space-y-2">
        <p className="eyebrow">Vorher sichern (empfohlen)</p>
        <div className="flex flex-wrap gap-2">
          {targets.map((account) => (
            <Button
              key={account.id}
              type="button"
              variant="secondary"
              onClick={() => handleBackup(account)}
              loading={backupId === account.id}
              loadingText="Wird erstellt…"
              disabled={saving || (backupId !== null && backupId !== account.id)}
            >
              <ArrowDownTrayIcon className="h-5 w-5" aria-hidden="true" />
              Backup „{account.name}“
            </Button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="reset-confirm" className="block text-sm font-medium text-primary">
          Zur Bestätigung <span className="text-danger">{expected}</span> eingeben
        </label>
        <input
          id="reset-confirm"
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="mt-1 block w-full"
          autoComplete="off"
          disabled={saving}
        />
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
          Abbrechen
        </Button>
        <Button
          type="button"
          variant="danger"
          onClick={handleReset}
          disabled={!confirmed}
          loading={saving}
          loadingText="Wird zurückgesetzt…"
        >
          Endgültig zurücksetzen
        </Button>
      </div>
    </div>
  )
}

/** Karte „Konto zurücksetzen“ in den Einstellungen (Bereich des aktuellen Kontos) */
export default function ResetAccount() {
  const { settings } = useUserSettings()
  const [open, setOpen] = useState(false)
  const isOwner = settings?.role === 'OWNER'

  return (
    <div id="reset-account" className="card p-4 md:p-5">
      <h3 className="text-lg font-semibold text-primary mb-1">Konto zurücksetzen</h3>
      {isOwner ? (
        <div className="space-y-4">
          <p className="text-sm text-secondary">
            Löscht die Buchungen – wahlweise auch wiederkehrende Zahlungen, Kategorien und Händler.
            Kontoname, Bank, Gehaltstag und Mitglieder bleiben.
          </p>
          <Button type="button" variant="danger-outline" onClick={() => setOpen(true)}>
            <ArrowPathIcon className="h-5 w-5" aria-hidden="true" />
            Zurücksetzen…
          </Button>
        </div>
      ) : (
        <p className="text-sm text-secondary">
          Nur der <span className="font-medium text-primary">Inhaber</span> kann dieses Konto
          zurücksetzen.
        </p>
      )}
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Konto zurücksetzen" maxWidth="lg">
        {open && <ResetAccountDialog onClose={() => setOpen(false)} />}
      </Modal>
    </div>
  )
}
