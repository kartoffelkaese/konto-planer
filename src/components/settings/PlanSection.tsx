'use client'

import { useState } from 'react'
import { CheckIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/Button'
import { useApiQuery } from '@/hooks/useApiQuery'
import { useToast } from '@/hooks/useToast'
import { useUserSettings } from '@/hooks/useUserSettings'
import { getAccounts, getApiErrorMessage, setKeptAccount } from '@/lib/api'
import { formatDate } from '@/lib/dateUtils'
import {
  PLAN_FEATURES,
  PLAN_LABELS,
  daysLeft,
  writableOwnedAccountIds,
  type PlanId,
} from '@/lib/plans'

type AccountItem = { id: string; name: string; role: string }

function FeatureList({ plan }: { plan: PlanId }) {
  return (
    <ul className="space-y-1.5">
      {PLAN_FEATURES[plan].map((feature) => (
        <li key={feature} className="flex items-start gap-2 text-sm text-primary">
          <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
          {feature}
        </li>
      ))}
    </ul>
  )
}

/** Einstellungen → „Dein Level“: aktuelles Level, Testphase, Umfang und Wahl des beschreibbaren Kontos */
export default function PlanSection() {
  const { settings, plan, entitlements, reload } = useUserSettings()
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const enabled = Boolean(settings?.plansEnabled)
  const { data: accounts } = useApiQuery('plan-accounts', () => getAccounts<AccountItem[]>(), {
    enabled,
  })

  if (!settings || !enabled) return null

  const trialDays = settings.planSource === 'TRIAL' && plan === 'FULL' ? daysLeft(settings.planExpiresAt) : null
  const trialEnded = settings.planSource === 'TRIAL' && plan === 'BASIC'

  let status: string
  if (trialDays !== null) {
    status = `Testphase – noch ${trialDays === 1 ? '1 Tag' : `${trialDays} Tage`}, bis ${formatDate(settings.planExpiresAt!)}. Danach gilt „${PLAN_LABELS.BASIC}“.`
  } else if (trialEnded) {
    status = 'Deine Testphase ist beendet.'
  } else if (plan === 'FULL' && settings.planExpiresAt) {
    status = `Gültig bis ${formatDate(settings.planExpiresAt)}.`
  } else if (plan === 'FULL') {
    status = 'Dauerhaft freigeschaltet.'
  } else {
    status = 'Kostenlos.'
  }

  // Wer „Komplett“ fest hat, braucht den Vergleich nicht; in der Testphase zeigt er, was danach wegfällt
  const showComparison = plan === 'BASIC' || trialDays !== null

  // Mehr eigene Konten als erlaubt: Auswahl, welches beschreibbar bleibt
  const owned = (accounts ?? []).filter((a) => a.role === 'OWNER')
  const writable = writableOwnedAccountIds(
    owned.map((a) => a.id),
    settings.keptAccountId,
    entitlements.maxOwnedAccounts
  )
  const keptId = writable?.[0] ?? null
  const choice = selectedId ?? keptId

  const handleSaveKept = async () => {
    if (!choice || choice === keptId) return
    setSaving(true)
    try {
      await setKeptAccount(choice)
      setSelectedId(null)
      reload()
      showToast('Beschreibbares Konto geändert', 'success')
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Auswahl konnte nicht gespeichert werden'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div id="plan" className="card scroll-mt-6 p-4 md:p-5">
      <h2 className="text-lg font-medium text-primary mb-1">Dein Level</h2>
      <p className={`text-sm text-secondary ${showComparison || writable ? 'mb-4' : ''}`}>
        <span className="font-medium text-primary">{PLAN_LABELS[plan]}</span> · {status}
      </p>

      {showComparison && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-control bg-surface-muted p-4">
            <p className="eyebrow mb-2">{PLAN_LABELS.BASIC} · kostenlos</p>
            <FeatureList plan="BASIC" />
          </div>
          <div className="rounded-control bg-surface-muted p-4">
            <p className="eyebrow mb-2">{PLAN_LABELS.FULL} · zusätzlich</p>
            <FeatureList plan="FULL" />
          </div>
        </div>
      )}

      {writable && (
        <div className="mt-5 space-y-3">
          <div>
            <h3 className="text-sm font-medium text-primary">Beschreibbares Konto</h3>
            <p className="mt-1 text-sm text-secondary">
              Das Level „{PLAN_LABELS.BASIC}“ umfasst ein Konto. Wähle, welches du weiter bearbeiten
              möchtest – die anderen bleiben sichtbar und lassen sich sichern oder löschen.
            </p>
          </div>
          <div className="space-y-2" role="radiogroup" aria-label="Beschreibbares Konto">
            {owned.map((account) => (
              <label key={account.id} className="flex items-center gap-2 text-sm text-primary">
                <input
                  type="radio"
                  name="kept-account"
                  checked={choice === account.id}
                  onChange={() => setSelectedId(account.id)}
                  className="h-4 w-4 border-border text-accent focus:ring-accent"
                />
                {account.name}
              </label>
            ))}
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleSaveKept}
            loading={saving}
            loadingText="Wird gespeichert…"
            disabled={!choice || choice === keptId}
          >
            Auswahl speichern
          </Button>
        </div>
      )}
    </div>
  )
}
