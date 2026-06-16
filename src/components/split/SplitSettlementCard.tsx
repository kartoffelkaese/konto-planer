'use client'

import { useState } from 'react'
import { ArrowLongRightIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/Button'
import { useToast } from '@/hooks/useToast'
import { formatCurrency } from '@/lib/formatters'
import type { SplitDebtSuggestion } from '@/types/split'
import { createSplitSettlement } from '@/lib/api'
import { splitSectionCardClass, splitSectionTitleClass } from '@/components/split/splitUiClasses'

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
  const { showToast } = useToast()
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
      showToast(
        `${suggestion.fromDisplayName} → ${suggestion.toDisplayName}: Ausgleich erfasst`,
        'success'
      )
      onSettled()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ausgleich konnte nicht gespeichert werden'
      setError(message)
      showToast(message, 'error')
    } finally {
      setLoadingKey(null)
    }
  }

  if (suggestions.length === 0) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-accent-border bg-accent-subtle p-4 text-sm text-primary">
        <CheckCircleIcon className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
        <div>
          <p className="font-medium">Alles ausgeglichen</p>
          <p className="mt-0.5 text-secondary">
            Aktuell schuldet niemand etwas — oder offene Beträge wurden bereits ausgeglichen.
          </p>
        </div>
      </div>
    )
  }

  return (
    <section className={`${splitSectionCardClass} space-y-4`}>
      <div>
        <h3 className={splitSectionTitleClass}>Nächste Ausgleiche</h3>
        <p className="text-sm text-secondary">
          Minimale Anzahl Zahlungen, um alle Salden auszugleichen.
          {!readOnly && ' Markieren Sie erledigte Überweisungen als ausgeglichen.'}
        </p>
      </div>

      <ul className="space-y-3">
        {suggestions.map((suggestion) => {
          const key = `${suggestion.fromParticipantId}-${suggestion.toParticipantId}`
          return (
            <li
              key={key}
              className="flex flex-col gap-3 rounded-lg border border-border bg-canvas px-4 py-3 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="font-medium text-primary">{suggestion.fromDisplayName}</span>
                <ArrowLongRightIcon
                  className="h-4 w-4 shrink-0 text-secondary"
                  aria-hidden="true"
                />
                <span className="font-medium text-primary">{suggestion.toDisplayName}</span>
                <span className="font-semibold tabular-nums text-expense">
                  {formatCurrency(-suggestion.amount)}
                </span>
              </div>
              {!readOnly && (
                <Button
                  size="sm"
                  className="shrink-0"
                  onClick={() => handleSettle(suggestion)}
                  loading={loadingKey === key}
                  loadingText="…"
                >
                  Ausgeglichen
                </Button>
              )}
            </li>
          )
        })}
      </ul>

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
