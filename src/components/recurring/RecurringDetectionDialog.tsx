'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpTrayIcon } from '@heroicons/react/24/outline'
import Modal from '@/components/Modal'
import { Button } from '@/components/Button'
import { useToast } from '@/hooks/useToast'
import { useUserSettings } from '@/hooks/useUserSettings'
import { isCsvImportAvailableForBank } from '@/lib/csvImport/bankFormats'
import { listCsvFormats } from '@/lib/csvImport'
import {
  ApiError,
  createRecurringBulk,
  detectRecurring,
  getApiErrorMessage,
  getCategories,
  type RecurringDetectionResponse,
  type RecurringSuggestion,
} from '@/lib/api'
import type { Category } from '@/types'
import { formatCurrency } from '@/lib/formatters'
import { formatDate } from '@/lib/dateUtils'
import { RECURRING_INTERVALS } from '@/lib/recurringIntervals'

type EditableSuggestion = RecurringSuggestion & {
  selected: boolean
  editName: string
  editAmount: string
  editInterval: string
  editCategoryId: string
}

type FormatOption = { id: string; label: string }


function toEditable(suggestion: RecurringSuggestion): EditableSuggestion {
  return {
    ...suggestion,
    selected: suggestion.preselected,
    editName: suggestion.name,
    editAmount: Math.abs(suggestion.amount).toFixed(2),
    editInterval: suggestion.interval,
    editCategoryId: suggestion.categoryId ?? '',
  }
}

function parseAmountInput(value: string): number | null {
  const amount = Number(value.replace(',', '.'))
  return Number.isFinite(amount) && amount > 0 ? amount : null
}

/**
 * Assistent „Aus Kontoauszug erkennen“: Bank-Export hochladen, erkannte wiederkehrende
 * Zahlungen prüfen und die gewählten anlegen. Die Datei wird nur ausgewertet.
 */
export default function RecurringDetectionDialog({
  isOpen,
  onClose,
  onCreated,
  initialCsvText,
  initialFormatId,
}: {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
  /** Datei aus dem CSV-Import – dann wird sie sofort ausgewertet */
  initialCsvText?: string
  initialFormatId?: string
}) {
  const { showToast } = useToast()
  const { settings } = useUserSettings()
  // Ohne unterstützte Bank am Konto wählt man das Format vor dem Hochladen
  const bankSupported = isCsvImportAvailableForBank(settings?.bankId)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [csvText, setCsvText] = useState('')
  const [detecting, setDetecting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [serverFormats, setServerFormats] = useState<FormatOption[] | null>(null)
  const [formatId, setFormatId] = useState('')
  const [result, setResult] = useState<RecurringDetectionResponse | null>(null)
  const [items, setItems] = useState<EditableSuggestion[]>([])
  const [applySalaryDay, setApplySalaryDay] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])

  const reset = () => {
    setCsvText('')
    setError(null)
    setServerFormats(null)
    setFormatId('')
    setResult(null)
    setItems([])
    setApplySalaryDay(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const close = () => {
    reset()
    onClose()
  }

  const runDetection = async (csvText: string, chosenFormat?: string) => {
    setDetecting(true)
    setError(null)
    try {
      const response = await detectRecurring({ csvText, ...(chosenFormat ? { formatId: chosenFormat } : {}) })
      setResult(response)
      setItems(response.suggestions.map(toEditable))
      setApplySalaryDay(response.salaryDaySuggestion !== null)
      setServerFormats(null)
    } catch (err) {
      const data = err instanceof ApiError ? (err.data as { code?: string; availableFormats?: FormatOption[] }) : null
      if (data?.code === 'FORMAT_REQUIRED' && data.availableFormats) {
        setServerFormats(data.availableFormats)
      } else {
        setError(getApiErrorMessage(err, 'Die Datei konnte nicht ausgewertet werden.'))
      }
    } finally {
      setDetecting(false)
    }
  }

  // Aus dem CSV-Import geöffnet: dieselbe Datei gleich auswerten
  useEffect(() => {
    if (!isOpen || !initialCsvText) return
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      setCsvText(initialCsvText)
      return runDetection(initialCsvText, initialFormatId)
    })
    return () => {
      cancelled = true
    }
  }, [isOpen, initialCsvText, initialFormatId])

  useEffect(() => {
    if (!isOpen) return
    getCategories<Category>()
      .then(setCategories)
      .catch(() => setCategories([]))
  }, [isOpen])

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setCsvText(text)
    await runDetection(text, formatId || undefined)
  }

  const formats = serverFormats ?? (bankSupported ? null : listCsvFormats())

  const update = (key: string, patch: Partial<EditableSuggestion>) =>
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)))

  const selected = items.filter((item) => item.selected && item.status !== 'existing')
  const invalid = selected.some((item) => !item.editName.trim() || parseAmountInput(item.editAmount) === null)
  const salary = result?.salaryDaySuggestion ?? null

  const handleSave = async () => {
    setSaving(true)
    try {
      const { created } = await createRecurringBulk({
        items: selected.map((item) => {
          const amount = parseAmountInput(item.editAmount)!
          const keepMerchant = item.merchantId && item.editName.trim() === item.name
          return {
            ...(keepMerchant ? { merchantId: item.merchantId } : {}),
            merchant: item.editName.trim(),
            amount: item.direction === 'expense' ? -amount : amount,
            date: item.date,
            recurringInterval: item.editInterval,
            categoryId: item.editCategoryId || null,
          }
        }),
        ...(salary && applySalaryDay ? { salaryDay: salary.day } : {}),
      })
      showToast(
        created === 1 ? '1 wiederkehrende Zahlung angelegt' : `${created} wiederkehrende Zahlungen angelegt`,
        'success'
      )
      onCreated()
      close()
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Die Zahlungen konnten nicht angelegt werden.'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const sections = useMemo(
    () => ({
      income: items.filter((i) => i.direction === 'income' && i.status === 'active'),
      expense: items.filter((i) => i.direction === 'expense' && i.status === 'active'),
      ended: items.filter((i) => i.status === 'ended'),
      existing: items.filter((i) => i.status === 'existing'),
    }),
    [items]
  )

  const renderCard = (item: EditableSuggestion) => (
    <li key={item.key} className="rounded-control bg-surface-muted p-3 space-y-3">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={item.selected}
          onChange={(e) => update(item.key, { selected: e.target.checked })}
          className="mt-3 h-4 w-4 shrink-0 rounded border-border text-accent"
          aria-label={`${item.name} anlegen`}
        />
        <div className="min-w-0 flex-1 space-y-1">
          <label className="sr-only" htmlFor={`name-${item.key}`}>
            Name
          </label>
          <input
            id={`name-${item.key}`}
            type="text"
            value={item.editName}
            maxLength={100}
            onChange={(e) => update(item.key, { editName: e.target.value })}
            className="w-full font-medium"
          />
          <p className="text-xs text-secondary">
            {item.occurrences} Buchungen · {formatDate(item.firstDate)} – {formatDate(item.date)}
            {item.variable &&
              ` · schwankend ${formatCurrency(item.amountMin)} – ${formatCurrency(item.amountMax)}`}
            {item.amountChanged &&
              item.previousAmount !== null &&
              ` · Betrag geändert, zuvor ${formatCurrency(item.previousAmount)}`}
          </p>
          {item.confidence === 'low' && (
            <span className="inline-flex rounded-pill bg-pending-bg px-2 py-0.5 text-xs font-medium text-pending">
              unsicher
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:pl-7">
        <div>
          <label className="eyebrow block" htmlFor={`amount-${item.key}`}>
            {item.direction === 'income' ? 'Einnahme (€)' : 'Ausgabe (€)'}
          </label>
          <input
            id={`amount-${item.key}`}
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            value={item.editAmount}
            onChange={(e) => update(item.key, { editAmount: e.target.value })}
            className={`w-full amount ${item.direction === 'income' ? 'text-income' : 'text-expense'}`}
          />
        </div>
        <div>
          <label className="eyebrow block" htmlFor={`interval-${item.key}`}>
            Intervall
          </label>
          <select
            id={`interval-${item.key}`}
            value={item.editInterval}
            onChange={(e) => update(item.key, { editInterval: e.target.value })}
            className="w-full"
          >
            {RECURRING_INTERVALS.map((interval) => (
              <option key={interval.value} value={interval.value}>
                {interval.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="eyebrow block" htmlFor={`category-${item.key}`}>
            Kategorie
          </label>
          <select
            id={`category-${item.key}`}
            value={item.editCategoryId}
            onChange={(e) => update(item.key, { editCategoryId: e.target.value })}
            className="w-full"
          >
            <option value="">Keine Kategorie</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </li>
  )

  const renderSection = (title: string, list: EditableSuggestion[]) =>
    list.length > 0 && (
      <section className="space-y-2">
        <h3 className="eyebrow">{title}</h3>
        <ul className="space-y-2">{list.map(renderCard)}</ul>
      </section>
    )

  return (
    <Modal isOpen={isOpen} onClose={close} title="Aus Kontoauszug erkennen" maxWidth="2xl">
      {!result ? (
        <div className="space-y-4">
          <p className="text-sm text-secondary">
            Lade die Umsätze der letzten 18 Monate als CSV-Datei aus deinem Online-Banking hoch –
            jährliche Zahlungen werden erst erkannt, wenn sie zweimal vorkommen. Wir schlagen
            dir vor, welche Zahlungen regelmäßig wiederkehren; du entscheidest, was angelegt wird.
            Die Datei wird nur auf unserem Server ausgewertet, nicht gespeichert und an niemanden
            weitergegeben.
          </p>
          {formats && (
            <div>
              <label className="eyebrow block" htmlFor="detect-format">
                Bank des Kontoauszugs
              </label>
              <select
                id="detect-format"
                value={formatId}
                onChange={(e) => setFormatId(e.target.value)}
                className="w-full"
              >
                <option value="">Bitte wählen…</option>
                {formats.map((format) => (
                  <option key={format.id} value={format.id}>
                    {format.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          {error && (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            className="sr-only"
            aria-label="CSV-Datei wählen"
          />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={close}>
              Abbrechen
            </Button>
            {formats && csvText ? (
              <Button
                type="button"
                disabled={!formatId}
                loading={detecting}
                loadingText="Wird ausgewertet…"
                onClick={() => void runDetection(csvText, formatId)}
              >
                Auswerten
              </Button>
            ) : (
              <Button
                type="button"
                disabled={Boolean(formats) && !formatId}
                loading={detecting}
                loadingText="Wird ausgewertet…"
                onClick={() => fileInputRef.current?.click()}
              >
                <ArrowUpTrayIcon className="h-5 w-5" aria-hidden />
                CSV-Datei wählen
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <p className="text-sm text-secondary">
            {result.rowCount} Buchungen ausgewertet
            {result.period && ` (${formatDate(result.period.start)} – ${formatDate(result.period.end)})`}.{' '}
            {items.length === 0
              ? 'Darin haben wir keine regelmäßigen Zahlungen gefunden.'
              : sections.income.length + sections.expense.length + sections.ended.length === 0
                ? 'Alle regelmäßigen Zahlungen aus dieser Datei sind schon angelegt.'
                : 'Prüfe die Vorschläge und passe sie bei Bedarf an.'}
          </p>

          {salary && (
            <label className="flex items-start gap-3 rounded-control bg-accent-subtle p-3 text-sm text-primary">
              <input
                type="checkbox"
                checked={applySalaryDay}
                onChange={(e) => setApplySalaryDay(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-accent"
              />
              <span>
                Tag des Gehaltseingangs auf den <strong>{salary.day}.</strong> setzen
                <span className="block text-xs text-secondary">
                  „{salary.name}“ kommt meist um diesen Tag – danach richtet sich der Gehaltsmonat.
                </span>
              </span>
            </label>
          )}

          {renderSection('Einnahmen', sections.income)}
          {renderSection('Ausgaben', sections.expense)}

          {sections.ended.length > 0 && (
            <details className="space-y-2">
              <summary className="cursor-pointer text-sm font-medium text-primary">
                Vermutlich beendet ({sections.ended.length})
              </summary>
              <p className="text-xs text-secondary">
                Diese Zahlungen kamen früher regelmäßig, zuletzt aber nicht mehr.
              </p>
              <ul className="space-y-2">{sections.ended.map(renderCard)}</ul>
            </details>
          )}

          {sections.existing.length > 0 && (
            <details>
              <summary className="cursor-pointer text-sm font-medium text-primary">
                Bereits angelegt ({sections.existing.length})
              </summary>
              <ul className="mt-2 divide-y divide-hairline text-sm">
                {sections.existing.map((item) => (
                  <li key={item.key} className="flex justify-between gap-3 py-2">
                    <span className="min-w-0 truncate text-primary">{item.name}</span>
                    <span className={`amount ${item.direction === 'income' ? 'text-income' : 'text-expense'}`}>
                      {formatCurrency(item.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-hairline pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={reset}>
              Andere Datei
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={(selected.length === 0 && !(salary && applySalaryDay)) || invalid}
              loading={saving}
              loadingText="Wird angelegt…"
            >
              {selected.length === 1
                ? '1 wiederkehrende Zahlung anlegen'
                : `${selected.length} wiederkehrende Zahlungen anlegen`}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
