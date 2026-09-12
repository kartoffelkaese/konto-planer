'use client'

import { useMemo, useState } from 'react'
import Modal from '@/components/Modal'
import { Button } from '@/components/Button'
import { formatDateForInput } from '@/lib/dateUtils'
import { formatCurrency } from '@/lib/formatters'
import { createSplitSettlement } from '@/lib/api'
import type {
  SplitBalanceEntry,
  SplitDebtSuggestion,
  SplitParticipant,
} from '@/types/split'
import {
  splitHintClass,
  splitInputClass,
  splitLabelClass,
} from '@/components/split/splitUiClasses'

type SplitSettlementModalProps = {
  isOpen: boolean
  onClose: () => void
  listId: string
  participants: SplitParticipant[]
  balances: SplitBalanceEntry[]
  suggestion?: SplitDebtSuggestion | null
  onSaved: () => void | Promise<void>
}

function netFor(
  balances: SplitBalanceEntry[],
  participantId: string
): number {
  return balances.find((entry) => entry.participantId === participantId)?.net ?? 0
}

function openDebt(net: number): number {
  return net < -0.005 ? Math.round(-net * 100) / 100 : 0
}

function participantOptionLabel(
  participant: SplitParticipant,
  balances: SplitBalanceEntry[]
): string {
  const net = Math.round(netFor(balances, participant.id) * 100) / 100
  if (Math.abs(net) <= 0.005) {
    return `${participant.displayName} · ausgeglichen`
  }
  const prefix = net > 0 ? '+' : ''
  return `${participant.displayName} · ${prefix}${formatCurrency(net)}`
}

function SplitSettlementForm({
  listId,
  participants,
  balances,
  suggestion,
  onSaved,
  onCancel,
}: {
  listId: string
  participants: SplitParticipant[]
  balances: SplitBalanceEntry[]
  suggestion?: SplitDebtSuggestion | null
  onSaved: () => void | Promise<void>
  onCancel: () => void
}) {
  const [fromParticipantId, setFromParticipantId] = useState(
    suggestion?.fromParticipantId ?? ''
  )
  const [toParticipantId, setToParticipantId] = useState(
    suggestion?.toParticipantId ?? ''
  )
  const [amount, setAmount] = useState(
    suggestion ? String(suggestion.amount) : ''
  )
  const [date, setDate] = useState(formatDateForInput(new Date()))
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsedAmount = useMemo(() => {
    const value = Number.parseFloat(amount.replace(',', '.'))
    return Number.isFinite(value) ? Math.round(value * 100) / 100 : NaN
  }, [amount])

  const fromNet = netFor(balances, fromParticipantId)
  const fromDebt = openDebt(fromNet)
  const remaining = useMemo(() => {
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) return null

    if (
      suggestion &&
      fromParticipantId === suggestion.fromParticipantId &&
      toParticipantId === suggestion.toParticipantId
    ) {
      return Math.round((suggestion.amount - parsedAmount) * 100) / 100
    }

    if (fromDebt <= 0) return null
    return Math.round((fromDebt - parsedAmount) * 100) / 100
  }, [fromDebt, fromParticipantId, parsedAmount, suggestion, toParticipantId])

  const overpaying =
    fromParticipantId &&
    !Number.isNaN(parsedAmount) &&
    parsedAmount > 0 &&
    parsedAmount > fromDebt + 0.005

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!fromParticipantId || !toParticipantId) {
      setError('Bitte Von- und An-Teilnehmer wählen')
      return
    }
    if (fromParticipantId === toParticipantId) {
      setError('Von und An müssen unterschiedlich sein')
      return
    }
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Betrag muss größer als 0 sein')
      return
    }

    setLoading(true)
    setError(null)
    try {
      await createSplitSettlement(listId, {
        fromParticipantId,
        toParticipantId,
        amount: parsedAmount,
        note: note.trim() || undefined,
        settledAt: new Date(date).toISOString(),
      })
      await onSaved()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Ausgleich konnte nicht gespeichert werden'
      )
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="split-settlement-from" className={splitLabelClass}>
            Von
          </label>
          <select
            id="split-settlement-from"
            value={fromParticipantId}
            onChange={(e) => setFromParticipantId(e.target.value)}
            required
            className={`mt-1 ${splitInputClass}`}
          >
            <option value="">Bitte wählen…</option>
            {participants.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participantOptionLabel(participant, balances)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="split-settlement-to" className={splitLabelClass}>
            An
          </label>
          <select
            id="split-settlement-to"
            value={toParticipantId}
            onChange={(e) => setToParticipantId(e.target.value)}
            required
            className={`mt-1 ${splitInputClass}`}
          >
            <option value="">Bitte wählen…</option>
            {participants.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participantOptionLabel(participant, balances)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="split-settlement-amount" className={splitLabelClass}>
            Betrag (€)
          </label>
          <input
            id="split-settlement-amount"
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            placeholder="0,00"
            className={`mt-1 ${splitInputClass}`}
          />
          {remaining != null && remaining > 0.005 && (
            <p className={splitHintClass}>
              Danach bleiben {formatCurrency(remaining)} offen.
            </p>
          )}
          {remaining != null && Math.abs(remaining) <= 0.005 && (
            <p className={splitHintClass}>Dieser Betrag gleicht den offenen Rest aus.</p>
          )}
          {overpaying && (
            <p className="mt-1 text-sm text-secondary">
              Der Betrag übersteigt den offenen Saldo
              {fromDebt > 0 ? ` (${formatCurrency(fromDebt)})` : ''} des Zahlers.
            </p>
          )}
        </div>
        <div>
          <label htmlFor="split-settlement-date" className={splitLabelClass}>
            Datum
          </label>
          <input
            id="split-settlement-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className={`mt-1 ${splitInputClass}`}
          />
        </div>
      </div>

      <div>
        <label htmlFor="split-settlement-note" className={splitLabelClass}>
          Notiz (optional)
        </label>
        <input
          id="split-settlement-note"
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="z. B. 1. Teilzahlung von 2"
          className={`mt-1 ${splitInputClass}`}
        />
      </div>

      {error && (
        <div className="rounded-control border border-danger/20 bg-danger-subtle p-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap">
        <Button
          type="submit"
          loading={loading}
          loadingText="Speichern…"
          className="w-full sm:w-auto"
        >
          Ausgleich erfassen
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          className="w-full sm:w-auto"
        >
          Abbrechen
        </Button>
      </div>
    </form>
  )
}

export default function SplitSettlementModal({
  isOpen,
  onClose,
  listId,
  participants,
  balances,
  suggestion = null,
  onSaved,
}: SplitSettlementModalProps) {
  const title = suggestion
    ? 'Teilausgleich erfassen'
    : 'Zahlung erfassen'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="lg">
      {isOpen && (
        <SplitSettlementForm
          key={
            suggestion
              ? `${suggestion.fromParticipantId}-${suggestion.toParticipantId}-${suggestion.amount}`
              : 'free'
          }
          listId={listId}
          participants={participants}
          balances={balances}
          suggestion={suggestion}
          onSaved={async () => {
            await onSaved()
            onClose()
          }}
          onCancel={onClose}
        />
      )}
    </Modal>
  )
}
