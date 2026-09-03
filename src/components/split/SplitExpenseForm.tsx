'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/Button'
import SplitCategorySelect from '@/components/split/SplitCategorySelect'
import { formatDateForInput } from '@/lib/dateUtils'
import { formatCurrency, formatNumber } from '@/lib/formatters'
import type { SplitCategory, SplitListCurrency, SplitParticipant } from '@/types/split'
import { createSplitExpense, getSplitExchangeRate, updateSplitExpense } from '@/lib/api'
import type { SplitExpense } from '@/types/split'
import {
  splitInputClass,
  splitLabelClass,
  splitSegmentButtonClass,
} from '@/components/split/splitUiClasses'

type SplitExpenseFormProps = {
  listId: string
  participants: SplitParticipant[]
  categories: SplitCategory[]
  currencies: SplitListCurrency[]
  expense?: SplitExpense | null
  onSaved: (expense: SplitExpense) => void
  onCancel?: () => void
}

function initialInputCurrency(expense: SplitExpense | null | undefined): string {
  if (expense?.originalCurrencyCode) return expense.originalCurrencyCode
  return 'EUR'
}

function initialAmount(expense: SplitExpense | null | undefined): string {
  if (!expense) return ''
  if (expense.originalCurrencyCode && expense.originalAmount != null) {
    return String(expense.originalAmount)
  }
  return String(expense.amount)
}

export default function SplitExpenseForm({
  listId,
  participants,
  categories,
  currencies,
  expense,
  onSaved,
  onCancel,
}: SplitExpenseFormProps) {
  const [description, setDescription] = useState(expense?.description ?? '')
  const [inputCurrency, setInputCurrency] = useState(() => initialInputCurrency(expense))
  const [amount, setAmount] = useState(() => initialAmount(expense))
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
  const [ratePreview, setRatePreview] = useState<{
    eurAmount: number
    rate: number
    rateDate: string
  } | null>(null)
  const [rateLoading, setRateLoading] = useState(false)
  const [rateError, setRateError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currencyOptions = useMemo(
    () => ['EUR', ...currencies.map((c) => c.currencyCode)],
    [currencies]
  )

  const showCurrencyPicker = currencies.length > 0

  const toggleShare = (participantId: string) => {
    setShareParticipantIds((prev) =>
      prev.includes(participantId)
        ? prev.filter((id) => id !== participantId)
        : [...prev, participantId]
    )
  }

  useEffect(() => {
    if (inputCurrency === 'EUR') {
      setRatePreview(null)
      setRateError(null)
      return
    }

    const parsedAmount = Number.parseFloat(amount.replace(',', '.'))
    if (Number.isNaN(parsedAmount) || parsedAmount === 0) {
      setRatePreview(null)
      setRateError(null)
      return
    }

    const timer = window.setTimeout(async () => {
      setRateLoading(true)
      setRateError(null)
      try {
        const result = await getSplitExchangeRate(listId, {
          currency: inputCurrency,
          date: new Date(date).toISOString(),
          amount: parsedAmount,
        })
        if (result.eurAmount != null) {
          setRatePreview({
            eurAmount: result.eurAmount,
            rate: result.rate,
            rateDate: result.rateDate,
          })
        }
      } catch (err) {
        setRatePreview(null)
        setRateError(
          err instanceof Error ? err.message : 'Wechselkurs nicht verfügbar'
        )
      } finally {
        setRateLoading(false)
      }
    }, 400)

    return () => window.clearTimeout(timer)
  }, [amount, date, inputCurrency, listId])

  const amountLabel =
    inputCurrency === 'EUR' ? 'Betrag (€)' : `Betrag (${inputCurrency})`

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
    if (inputCurrency !== 'EUR' && rateError) {
      setError(rateError)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const payload = {
        paidByParticipantId,
        amount: parsedAmount,
        inputCurrency,
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
    <form onSubmit={handleSubmit} className="space-y-6">
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

      {showCurrencyPicker && (
        <fieldset>
          <legend className={`${splitLabelClass} mb-2`}>Währung</legend>
          <div className="flex flex-wrap gap-2">
            {currencyOptions.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setInputCurrency(code)}
                className={splitSegmentButtonClass(inputCurrency === code)}
                aria-pressed={inputCurrency === code}
              >
                {code}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="split-amount" className={splitLabelClass}>
            {amountLabel}
          </label>
          <input
            id="split-amount"
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            placeholder={
              inputCurrency === 'EUR'
                ? 'z. B. 42,50 oder -10 für Erstattung'
                : `z. B. Betrag in ${inputCurrency}`
            }
            className={`mt-1 ${splitInputClass}`}
          />
          {inputCurrency !== 'EUR' && (
            <p className="mt-1.5 text-xs text-secondary">
              {rateLoading && 'Kurs wird geladen…'}
              {!rateLoading && ratePreview && (
                <>
                  ≈ {formatCurrency(ratePreview.eurAmount)} (Kurs 1 {inputCurrency} ={' '}
                  {formatNumber(ratePreview.rate, 4)} € vom{' '}
                  {new Date(ratePreview.rateDate).toLocaleDateString('de-DE')})
                </>
              )}
              {!rateLoading && rateError && (
                <span className="text-danger">{rateError}</span>
              )}
            </p>
          )}
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
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
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

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap">
        <Button type="submit" loading={loading} loadingText="Speichern…" className="w-full sm:w-auto">
          {expense ? 'Speichern' : 'Hinzufügen'}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} className="w-full sm:w-auto">
            Abbrechen
          </Button>
        )}
      </div>
    </form>
  )
}
