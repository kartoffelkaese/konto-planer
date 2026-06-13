'use client'

import { CalendarDaysIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/Button'
import DateRangePicker from '@/components/DateRangePicker'
import {
  getCustomPeriodValidation,
  getTransactionPeriodOptions,
  isPeriodFilterActive,
  isValidTransactionPeriod,
  resolveTransactionPeriodRange,
  type TransactionPeriod,
} from '@/lib/transactionPeriodRange'

type TransactionPeriodFilterProps = {
  period: TransactionPeriod
  customStartDate: string
  customEndDate: string
  isSimpleAccount: boolean
  salaryDay: number
  searchQuery: string
  onSearchChange: (value: string) => void
  onPeriodChange: (period: TransactionPeriod) => void
  onCustomRangeChange: (startDate: string, endDate: string) => void
  onReset: () => void
}

export default function TransactionPeriodFilter({
  period,
  customStartDate,
  customEndDate,
  isSimpleAccount,
  salaryDay,
  searchQuery,
  onSearchChange,
  onPeriodChange,
  onCustomRangeChange,
  onReset,
}: TransactionPeriodFilterProps) {
  const options = getTransactionPeriodOptions(isSimpleAccount)
  const customValidation =
    period === 'custom'
      ? getCustomPeriodValidation(customStartDate, customEndDate)
      : { status: 'complete' as const, message: '' }
  const activeRange = resolveTransactionPeriodRange({
    period,
    startDate: customStartDate,
    endDate: customEndDate,
    salaryDay,
    isSimpleAccount,
  })
  const filterActive = isPeriodFilterActive(period)
  const showInvalidRange = customValidation.status === 'invalid'
  const showStatusMessage =
    period === 'custom' &&
    customValidation.status !== 'complete' &&
    customValidation.message.length > 0

  return (
    <section
      className={`rounded-lg border bg-surface p-4 mb-8 ${
        filterActive ? 'border-accent-border' : 'border-border'
      }`}
      aria-label="Suchen und filtern"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-primary">Suchen &amp; filtern</h2>
          {activeRange ? (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-secondary">
              <CalendarDaysIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {activeRange.label}
            </p>
          ) : (
            <p className="mt-1 text-xs text-secondary">Alle Buchungen</p>
          )}
        </div>
        {filterActive && (
          <Button type="button" variant="secondary" size="sm" onClick={onReset}>
            Zurücksetzen
          </Button>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="transaction-search" className="sr-only">
            Transaktionen durchsuchen
          </label>
          <div className="flex items-center gap-3 w-full rounded-control border border-border bg-surface px-3 py-2 shadow-sm focus-within:border-accent focus-within:outline focus-within:outline-2 focus-within:outline-accent-subtle focus-within:outline-offset-1">
            <MagnifyingGlassIcon
              className="h-5 w-5 shrink-0 text-secondary"
              aria-hidden="true"
            />
            <input
              id="transaction-search"
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Händler oder Beschreibung suchen…"
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-primary shadow-none focus:outline-none focus:ring-0"
            />
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-secondary">Zeitraum</p>
          <div
            className="grid grid-cols-1 gap-2 sm:grid-cols-3"
            role="radiogroup"
            aria-label="Zeitraum auswählen"
          >
            {options.map((option) => {
              const selected = period === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => {
                    if (isValidTransactionPeriod(option.value)) {
                      onPeriodChange(option.value)
                    }
                  }}
                  className={`rounded-control border px-3 py-2.5 text-left text-sm font-medium transition-colors duration-feedback focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
                    selected
                      ? 'border-accent bg-accent-subtle text-accent'
                      : 'border-border bg-surface text-primary hover:border-accent-border hover:bg-surface-muted'
                  }`}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>

        {period === 'custom' && (
          <DateRangePicker
            id="transaction-period"
            startDate={customStartDate}
            endDate={customEndDate}
            onRangeChange={onCustomRangeChange}
            invalid={showInvalidRange}
            statusMessage={showStatusMessage ? customValidation.message : undefined}
          />
        )}
      </div>
    </section>
  )
}
