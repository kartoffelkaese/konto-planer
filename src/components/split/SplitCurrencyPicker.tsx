'use client'

import { useEffect, useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/Button'
import { getSplitAvailableCurrencies } from '@/lib/api'
import {
  getSplitCurrencyLabel,
  SPLIT_MAX_CURRENCIES_PER_LIST,
  type SplitCurrencyOption,
} from '@/lib/splitCurrencies'
import {
  splitHintClass,
  splitInputClass,
  splitLabelClass,
} from '@/components/split/splitUiClasses'

type SplitCurrencyPickerProps = {
  value: string[]
  onChange: (currencyCodes: string[]) => void
  idPrefix?: string
  disabled?: boolean
}

export default function SplitCurrencyPicker({
  value,
  onChange,
  idPrefix = 'split-currency',
  disabled = false,
}: SplitCurrencyPickerProps) {
  const [selectedCode, setSelectedCode] = useState('')
  const [availableCurrencies, setAvailableCurrencies] = useState<
    SplitCurrencyOption[]
  >([])
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    getSplitAvailableCurrencies()
      .then((options) => {
        if (!cancelled) {
          setAvailableCurrencies(options)
          setLoadError(null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError('Währungsliste konnte nicht geladen werden')
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const configuredCodes = new Set(value)
  const available = availableCurrencies.filter(
    (currency) => !configuredCodes.has(currency.code)
  )

  const handleAdd = () => {
    if (!selectedCode || configuredCodes.has(selectedCode)) return
    onChange([...value, selectedCode])
    setSelectedCode('')
  }

  const handleRemove = (currencyCode: string) => {
    onChange(value.filter((code) => code !== currencyCode))
  }

  const canAdd =
    !disabled &&
    value.length < SPLIT_MAX_CURRENCIES_PER_LIST &&
    available.length > 0

  return (
    <div className="space-y-2">
      <div>
        <label htmlFor={`${idPrefix}-select`} className={splitLabelClass}>
          Fremdwährungen (optional)
        </label>
        <p className={splitHintClass}>
          Mehrere Währungen möglich (z. B. USD + GBP). Intern wird immer in Euro gerechnet.
        </p>
      </div>

      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {value.map((currencyCode) => (
            <li key={currencyCode}>
              <span className="inline-flex items-center gap-1 rounded-full border border-accent-border bg-accent-subtle px-3 py-1 text-sm text-primary">
                {currencyCode}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemove(currencyCode)}
                    className="rounded-full p-0.5 text-secondary hover:text-danger hover:bg-danger-subtle"
                    aria-label={`${currencyCode} entfernen`}
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

      {loadError && (
        <p className="text-sm text-danger">{loadError}</p>
      )}

      {canAdd && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor={`${idPrefix}-select`} className="sr-only">
              Währung hinzufügen
            </label>
            <select
              id={`${idPrefix}-select`}
              value={selectedCode}
              onChange={(e) => setSelectedCode(e.target.value)}
              disabled={disabled}
              className={splitInputClass}
            >
              <option value="">Bitte wählen…</option>
              {available.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.label}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleAdd}
            disabled={!selectedCode || disabled}
            className="w-full sm:w-auto"
          >
            Hinzufügen
          </Button>
        </div>
      )}

      {value.length >= SPLIT_MAX_CURRENCIES_PER_LIST && (
        <p className={splitHintClass}>
          Maximal {SPLIT_MAX_CURRENCIES_PER_LIST} Fremdwährungen pro Liste.
        </p>
      )}
    </div>
  )
}
