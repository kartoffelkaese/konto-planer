'use client'

import { useState } from 'react'
import { ArrowLongRightIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/Button'
import { formatCurrency } from '@/lib/formatters'
import SplitSettlementModal from '@/components/split/SplitSettlementModal'
import type {
  SplitBalanceEntry,
  SplitDebtSuggestion,
  SplitParticipant,
} from '@/types/split'
import { splitSectionCardClass, splitSectionTitleClass } from '@/components/split/splitUiClasses'

type SplitSettlementCardProps = {
  listId: string
  suggestions: SplitDebtSuggestion[]
  participants: SplitParticipant[]
  balances: SplitBalanceEntry[]
  onSettled: () => void
  readOnly?: boolean
}

export default function SplitSettlementCard({
  listId,
  suggestions,
  participants,
  balances,
  onSettled,
  readOnly = false,
}: SplitSettlementCardProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState<SplitDebtSuggestion | null>(
    null
  )

  const openSuggestion = (suggestion: SplitDebtSuggestion) => {
    setActiveSuggestion(suggestion)
    setModalOpen(true)
  }

  const openFree = () => {
    setActiveSuggestion(null)
    setModalOpen(true)
  }

  const modal = (
    <SplitSettlementModal
      isOpen={modalOpen}
      onClose={() => setModalOpen(false)}
      listId={listId}
      participants={participants}
      balances={balances}
      suggestion={activeSuggestion}
      onSaved={onSettled}
    />
  )

  if (suggestions.length === 0) {
    return (
      <>
        <div className="flex flex-col gap-3 rounded-lg border border-accent-border bg-accent-subtle p-4 text-sm text-primary sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <CheckCircleIcon className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
            <div>
              <p className="font-medium">Alles ausgeglichen</p>
              <p className="mt-0.5 text-secondary">
                Aktuell schuldet niemand etwas — oder offene Beträge wurden bereits ausgeglichen.
                {!readOnly && ' Freie Zahlungen können trotzdem nachgetragen werden.'}
              </p>
            </div>
          </div>
          {!readOnly && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={openFree}
              className="w-full shrink-0 sm:w-auto"
            >
              Zahlung erfassen
            </Button>
          )}
        </div>
        {modal}
      </>
    )
  }

  return (
    <section className={`${splitSectionCardClass} space-y-4`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className={splitSectionTitleClass}>Nächste Ausgleiche</h3>
          <p className="text-sm text-secondary">
            Minimale Anzahl Zahlungen, um alle Salden auszugleichen.
            {!readOnly && ' Teilzahlungen und freie Zahlungen zwischen beliebigen Teilnehmern sind möglich.'}
          </p>
        </div>
        {!readOnly && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={openFree}
            className="w-full shrink-0 sm:w-auto"
          >
            Zahlung erfassen
          </Button>
        )}
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
                  type="button"
                  size="sm"
                  className="w-full shrink-0 sm:w-auto"
                  onClick={() => openSuggestion(suggestion)}
                >
                  Ausgleich erfassen
                </Button>
              )}
            </li>
          )
        })}
      </ul>

      {modal}
    </section>
  )
}
