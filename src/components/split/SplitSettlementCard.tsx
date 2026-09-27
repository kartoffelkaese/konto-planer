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
import { splitSectionCardClass } from '@/components/split/splitUiClasses'
import { getParticipantInitials } from '@/components/split/splitParticipantUtils'

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
        <div className="card flex flex-col gap-3 p-4 text-sm text-primary sm:flex-row sm:items-center sm:justify-between md:p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-income-bg text-income">
              <CheckCircleIcon className="h-5 w-5" aria-hidden="true" />
            </span>
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
          <h3 className="text-base font-semibold text-primary">Nächste Ausgleiche</h3>
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

      <ul className="space-y-2">
        {suggestions.map((suggestion) => {
          const key = `${suggestion.fromParticipantId}-${suggestion.toParticipantId}`
          return (
            <li
              key={key}
              className="flex flex-col gap-3 rounded-control bg-surface-muted/70 p-3 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex -space-x-2 shrink-0" aria-hidden="true">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-expense-bg text-xs font-semibold text-expense ring-2 ring-surface">
                    {getParticipantInitials(suggestion.fromDisplayName) || '?'}
                  </span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-income-bg text-xs font-semibold text-income ring-2 ring-surface">
                    {getParticipantInitials(suggestion.toDisplayName) || '?'}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-primary">
                    <span className="truncate">{suggestion.fromDisplayName}</span>
                    <ArrowLongRightIcon className="h-4 w-4 shrink-0 text-secondary" aria-label="an" />
                    <span className="truncate">{suggestion.toDisplayName}</span>
                  </span>
                  <span className="amount block text-primary">
                    {formatCurrency(suggestion.amount)}
                  </span>
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
