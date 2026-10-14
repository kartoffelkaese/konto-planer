'use client'

import { useState } from 'react'
import Modal from '@/components/Modal'
import { Button } from '@/components/Button'
import { useApiQuery } from '@/hooks/useApiQuery'
import { useToast } from '@/hooks/useToast'
import { useUserSettings } from '@/hooks/useUserSettings'
import { getAccounts, getApiErrorMessage, setKeptAccount } from '@/lib/api'
import { KEPT_ACCOUNT_CHANGE_DAYS, PLAN_LABELS, writableOwnedAccountIds } from '@/lib/plans'

type AccountItem = { id: string; name: string; role: string }

function postponedKey(userId: string) {
  return `kept-account-choice-postponed:${userId}`
}

function readPostponed(userId: string): boolean {
  try {
    return window.sessionStorage.getItem(postponedKey(userId)) === '1'
  } catch {
    return false
  }
}

/**
 * Nach einer Herabstufung auf „Start“ mit mehreren eigenen Konten: einmal fragen, welches
 * beschreibbar bleibt. „Später entscheiden“ gilt bis zum nächsten Besuch; bis dahin bleibt
 * das bisherige (älteste bzw. zuletzt gewählte) Konto beschreibbar.
 */
export default function KeptAccountDialog() {
  const { settings, reload } = useUserSettings()
  const { showToast } = useToast()
  const [postponedFor, setPostponedFor] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const required = Boolean(settings?.plansEnabled && settings.keptAccountChoiceRequired)
  const { data: accounts } = useApiQuery('kept-account-choice', () => getAccounts<AccountItem[]>(), {
    enabled: required,
  })

  if (!settings || !required || !accounts) return null
  if (postponedFor === settings.id || readPostponed(settings.id)) return null

  const owned = accounts.filter((a) => a.role === 'OWNER')
  if (owned.length < 2) return null

  // Vorauswahl: das gerade geöffnete eigene Konto, sonst das bisher beschreibbare
  const current =
    writableOwnedAccountIds(owned.map((a) => a.id), settings.keptAccountId, 1)?.[0] ?? owned[0].id
  const preselected = owned.some((a) => a.id === settings.activeAccountId)
    ? settings.activeAccountId!
    : current
  const choice = selectedId ?? preselected

  const reason =
    settings.planSource === 'TRIAL'
      ? 'Deine Testphase ist beendet.'
      : settings.planSource === 'STRIPE'
        ? `Dein Abo „${PLAN_LABELS.FULL}“ ist beendet.`
        : `Dein Level ist jetzt „${PLAN_LABELS.BASIC}“.`

  const postpone = () => {
    try {
      window.sessionStorage.setItem(postponedKey(settings.id), '1')
    } catch {
      // ohne Speicher gilt „Später“ nur bis zum Neuladen
    }
    setPostponedFor(settings.id)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await setKeptAccount(choice)
      const name = owned.find((a) => a.id === choice)?.name ?? 'Das Konto'
      showToast(`„${name}“ bleibt beschreibbar`, 'success')
      reload()
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Auswahl konnte nicht gespeichert werden'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen onClose={postpone} title="Welches Konto möchtest du weiter bearbeiten?" maxWidth="md">
      <div className="space-y-4">
        <p className="text-sm text-secondary">
          {reason} Es umfasst ein Konto zum Bearbeiten. Die anderen bleiben sichtbar und lassen sich
          sichern oder löschen – es geht nichts verloren.
        </p>

        <div className="space-y-2" role="radiogroup" aria-label="Beschreibbares Konto">
          {owned.map((account) => (
            <label
              key={account.id}
              className="flex min-h-11 items-center gap-3 rounded-control bg-surface-muted px-3 text-sm text-primary"
            >
              <input
                type="radio"
                name="kept-account-choice"
                checked={choice === account.id}
                onChange={() => setSelectedId(account.id)}
                className="h-4 w-4 border-border text-accent focus:ring-accent"
              />
              {account.name}
            </label>
          ))}
        </div>

        <p className="text-xs text-secondary">
          Danach lässt sich das Konto nur einmal in {KEPT_ACCOUNT_CHANGE_DAYS} Tagen wechseln (unter
          Einstellungen → „Dein Level“).
        </p>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={postpone} disabled={saving}>
            Später entscheiden
          </Button>
          <Button type="button" onClick={handleSave} loading={saving} loadingText="Wird gespeichert…">
            Auswahl speichern
          </Button>
        </div>
      </div>
    </Modal>
  )
}
