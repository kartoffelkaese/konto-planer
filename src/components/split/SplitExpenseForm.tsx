'use client'

import { useState } from 'react'
import { Button } from '@/components/Button'
import SplitCategorySelect from '@/components/split/SplitCategorySelect'
import { formatDateForInput } from '@/lib/dateUtils'
import type { SplitCategory, SplitParticipant } from '@/types/split'
import { createSplitExpense, updateSplitExpense } from '@/lib/api'
import type { SplitExpense } from '@/types/split'
import {
  splitHintClass,
  splitInputClass,
  splitLabelClass,
  splitSectionCardClass,
  splitSegmentButtonClass,
} from '@/components/split/splitUiClasses'

type SplitExpenseFormProps = {
  listId: string
  participants: SplitParticipant[]
  categories: SplitCategory[]
  expense?: SplitExpense | null
  onSaved: (expense: SplitExpense) => void
  onCancel?: () => void
}

export default function SplitExpenseForm({
  listId,
  participants,
  categories,
  expense,
  onSaved,
  onCancel,
}: SplitExpenseFormProps) {
  const [description, setDescription] = useState(expense?.description ?? '')
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '')
  const [date, setDate] = useState(
    expense ? formatDateForInput(expense.date) : formatDateForInput(new Date())
  )
  const [paidByParticipantId, setPaidByParticipantId] = useState(
    expense?.paidByParticipantId ?? participants[0]?.id ?? ''
  )
  const [categoryId, setCategoryId] = useState<string | null>(expense?.categoryId ?? null)
  const [localCategories, setLocalCategories] = useState(categories)
  const [shareParticipantIds, setShareParticipantIds] = useState<string[]>(
    expense?.shareParticipantIds?.length
      ? expense.shareParticipantIds
      : participants.map((p) => p.id)
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleShare = (participantId: string) => {
    setShareParticipantIds((prev) =>
      prev.includes(participantId)
        ? prev.filter((id) => id !== participantId)
        : [...prev, participantId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsedAmount = Number.parseFloat(amount.replace(',', '.'))
    if (Number.isNaN(parsedAmount) || parsedAmount === 0) {
      setError('Bitte einen gültigen Betrag eingeben (0 ist nicht erlaubt, Minusbeträge für Erstattungen)')
      return
    }
    if (shareParticipantIds.length === 0) {
      setError('Mindestens ein Teilnehmer für die Aufteilung auswählen')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const payload = {
        paidByParticipantId,
        amount: parsedAmount,
        description: description.trim(),
        date: new Date(date).toISOString(),
        categoryId,
        shareParticipantIds,
      }

      const saved = expense
        ? await updateSplitExpense(listId, { expenseId: expense.id, ...payload })
        : await createSplitExpense(listId, payload)

      onSaved(saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`${splitSectionCardClass} space-y-6`}>
      <h3 className="text-lg font-medium text-primary">
        {expense ? 'Ausgabe bearbeiten' : 'Neue Ausgabe'}
      </h3>

      <div>
        <label htmlFor="split-desc" className={splitLabelClass}>
          Beschreibung
        </label>
        <input
          id="split-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          placeholder="z. B. Pizza, Miete, Benzin"
          className={`mt-1 ${splitInputClass}`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="split-amount" className={splitLabelClass}>
            Betrag (€)
          </label>
          <input
            id="split-amount"
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            placeholder="z. B. 42,50 oder -10 für Erstattung"
            className={`mt-1 ${splitInputClass}`}
          />
          <p className={splitHintClass}>
            Negative Beträge für Erstattungen oder Gutschriften — werden bei den Salden berücksichtigt.
          </p>
        </div>
        <div>
          <label htmlFor="split-date" className={splitLabelClass}>
            Datum
          </label>
          <input
            id="split-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className={`mt-1 ${splitInputClass}`}
          />
        </div>
      </div>

      <div>
        <label htmlFor="split-payer" className={splitLabelClass}>
          Bezahlt von
        </label>
        <select
          id="split-payer"
          value={paidByParticipantId}
          onChange={(e) => setPaidByParticipantId(e.target.value)}
          className={`mt-1 ${splitInputClass}`}
        >
          {participants.map((p) => (
            <option key={p.id} value={p.id}>
              {p.displayName}
              {!p.hasAccount && !p.userId ? ' (ohne Konto)' : ''}
            </option>
          ))}
        </select>
      </div>

      <SplitCategorySelect
        listId={listId}
        categories={localCategories}
        value={categoryId}
        onChange={setCategoryId}
        onCategoryCreated={(c) => setLocalCategories((prev) => [...prev, c])}
      />

      <fieldset>
        <legend className={`${splitLabelClass} mb-2`}>Aufteilen auf (gleichmäßig)</legend>
        <div className="flex flex-wrap gap-2">
          {participants.map((p) => {
            const selected = shareParticipantIds.includes(p.id)
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggleShare(p.id)}
                className={splitSegmentButtonClass(selected)}
                aria-pressed={selected}
              >
                {p.displayName}
              </button>
            )
          })}
        </div>
      </fieldset>

      {error && (
        <div className="p-3 bg-danger-subtle text-danger rounded-control border border-danger/20 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={loading} loadingText="Speichern…">
          {expense ? 'Speichern' : 'Hinzufügen'}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Abbrechen
          </Button>
        )}
      </div>
    </form>
  )
}
