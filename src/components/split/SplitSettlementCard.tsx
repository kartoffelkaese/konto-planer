'use client'

import { useState } from 'react'
import { Button } from '@/components/Button'
import { formatCurrency } from '@/lib/formatters'
import type { SplitDebtSuggestion } from '@/types/split'
import { createSplitSettlement } from '@/lib/api'
import { splitListItemClass, splitSectionTitleClass } from '@/components/split/splitUiClasses'

type SplitSettlementCardProps = {
  listId: string
  suggestions: SplitDebtSuggestion[]
  onSettled: () => void
  readOnly?: boolean
}

export default function SplitSettlementCard({
  listId,
  suggestions,
  onSettled,
  readOnly = false,
}: SplitSettlementCardProps) {
  const [loadingKey, setLoadingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSettle = async (suggestion: SplitDebtSuggestion) => {
    const key = `${suggestion.fromParticipantId}-${suggestion.toParticipantId}`
    setLoadingKey(key)
    setError(null)
    try {
      await createSplitSettlement(listId, {
        fromParticipantId: suggestion.fromParticipantId,
        toParticipantId: suggestion.toParticipantId,
        amount: suggestion.amount,
      })
      onSettled()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler')
    } finally {
      setLoadingKey(null)
    }
  }

  if (suggestions.length === 0) {
    return (
      <div className="rounded-lg border border-accent-border bg-accent-subtle p-4 text-sm text-primary">
        Alle Salden sind ausgeglichen — niemand schuldet derzeit etwas.
      </div>
    )
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <h3 className={splitSectionTitleClass}>Vorgeschlagene Ausgleiche</h3>
      <ul className="space-y-3">
        {suggestions.map((s) => {
          const key = `${s.fromParticipantId}-${s.toParticipantId}`
          return (
            <li key={key} className={splitListItemClass}>
              <p className="text-sm text-primary min-w-0 flex-1">
                <span className="font-medium">{s.fromDisplayName}</span>
                {' schuldet '}
                <span className="font-medium">{s.toDisplayName}</span>
                {' '}
                <span className="font-semibold tabular-nums text-expense">
                  {formatCurrency(-s.amount)}
                </span>
              </p>
              {!readOnly && (
                <Button
                  size="sm"
                  className="shrink-0"
                  onClick={() => handleSettle(s)}
                  loading={loadingKey === key}
                  loadingText="…"
                >
                  Als ausgeglichen markieren
                </Button>
              )}
            </li>
          )
        })}
      </ul>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </section>
  )
}
