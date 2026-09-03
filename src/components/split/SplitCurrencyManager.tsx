'use client'

import { useEffect, useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/Button'
import { useToast } from '@/hooks/useToast'
import {
  addSplitCurrency,
  getSplitAvailableCurrencies,
  removeSplitCurrency,
} from '@/lib/api'
import {
  getSplitCurrencyLabel,
  SPLIT_MAX_CURRENCIES_PER_LIST,
  type SplitCurrencyOption,
} from '@/lib/splitCurrencies'
import type { SplitListCurrency } from '@/types/split'
import {
  splitInputClass,
  splitLabelClass,
  splitSectionCardClass,
} from '@/components/split/splitUiClasses'

type SplitCurrencyManagerProps = {
  listId: string
  currencies: SplitListCurrency[]
  onChange: (currencies: SplitListCurrency[]) => void
  readOnly?: boolean
}

export default function SplitCurrencyManager({
  listId,
  currencies,
  onChange,
  readOnly = false,
}: SplitCurrencyManagerProps) {
  const { showToast } = useToast()
  const [selectedCode, setSelectedCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [availableCurrencies, setAvailableCurrencies] = useState<
    SplitCurrencyOption[]
  >([])

  useEffect(() => {
    let cancelled = false

    getSplitAvailableCurrencies()
      .then((options) => {
        if (!cancelled) setAvailableCurrencies(options)
      })
      .catch(() => {
        if (!cancelled) {
          showToast('Währungsliste konnte nicht geladen werden', 'error')
        }
      })

    return () => {
      cancelled = true
    }
  }, [showToast])

  const configuredCodes = new Set(currencies.map((c) => c.currencyCode))
  const available = availableCurrencies.filter(
    (c) => !configuredCodes.has(c.code)
  )

  const handleAdd = async () => {
    if (!selectedCode) return
    setLoading(true)
    try {
      const created = await addSplitCurrency(listId, selectedCode)
      onChange([...currencies, created])
      setSelectedCode('')
      showToast(`${getSplitCurrencyLabel(created.currencyCode)} hinzugefügt`, 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Fehler beim Hinzufügen', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (currencyCode: string) => {
    setLoading(true)
    try {
      await removeSplitCurrency(listId, currencyCode)
      onChange(currencies.filter((c) => c.currencyCode !== currencyCode))
      showToast(`${getSplitCurrencyLabel(currencyCode)} entfernt`, 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Fehler beim Entfernen', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className={`${splitSectionCardClass} space-y-4`}>
      <div>
        <h3 className="text-base font-medium text-primary">Fremdwährungen (optional)</h3>
        <p className="text-xs text-secondary mt-0.5">
          Mehrere Währungen möglich (z. B. USD + GBP). Intern wird immer in Euro gerechnet.
        </p>
      </div>

      {currencies.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {currencies.map((currency) => (
            <li key={currency.id}>
              <span className="inline-flex items-center gap-1 rounded-full border border-accent-border bg-accent-subtle px-3 py-1 text-sm text-primary">
                {currency.currencyCode}
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemove(currency.currencyCode)}
                    disabled={loading}
                    className="rounded-full p-0.5 text-secondary hover:text-danger hover:bg-danger-subtle"
                    aria-label={`${currency.currencyCode} entfernen`}
                  >
                    <XMarkIcon className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-secondary">Keine Fremdwährungen — nur Euro.</p>
      )}

      {!readOnly && currencies.length < SPLIT_MAX_CURRENCIES_PER_LIST && available.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="split-add-currency" className={splitLabelClass}>
              Währung hinzufügen
            </label>
            <select
              id="split-add-currency"
              value={selectedCode}
              onChange={(e) => setSelectedCode(e.target.value)}
              className={`mt-1 ${splitInputClass}`}
            >
              <option value="">Bitte wählen…</option>
              {available.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleAdd}
            disabled={!selectedCode || loading}
            loading={loading}
            loadingText="Hinzufügen…"
            className="w-full sm:w-auto"
          >
            Hinzufügen
          </Button>
        </div>
      )}
    </section>
  )
}
