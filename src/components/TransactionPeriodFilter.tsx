'use client'

import { CalendarDaysIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/Button'
import DateRangePicker from '@/components/DateRangePicker'
import SegmentedControl from '@/components/SegmentedControl'
import {
  getCustomPeriodValidation,
  getTransactionPeriodOptions,
  isPeriodFilterActive,
  isValidTransactionPeriod,
  resolveTransactionPeriodRange,
  type TransactionPeriod,
} from '@/lib/transactionPeriodRange'

/** Kurzformen für schmale Displays (volle Bezeichnung bleibt als aria-label) */
const SHORT_LABELS: Partial<Record<TransactionPeriod, string>> = {
  all: 'Alle',
  custom: 'Zeitraum',
}

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
    <section className="card p-4 md:p-5 mb-4 md:mb-6 space-y-4" aria-label="Suchen und filtern">
      <div className="relative">
        <label htmlFor="transaction-search" className="sr-only">
          Transaktionen durchsuchen
        </label>
        <MagnifyingGlassIcon
          className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-secondary"
          aria-hidden="true"
        />
        <input
          id="transaction-search"
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Händler oder Beschreibung…"
          className="block w-full rounded-control pl-11 text-sm"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <SegmentedControl
          ariaLabel="Zeitraum auswählen"
          className="grid w-full grid-cols-3 sm:w-auto"
          value={period}
          onChange={(next) => {
            if (isValidTransactionPeriod(next)) onPeriodChange(next)
          }}
          options={options.map((option) => ({
            value: option.value,
            label: option.label,
            shortLabel: SHORT_LABELS[option.value] ?? option.label.replace(/^Nur /, ''),
          }))}
        />

        <div className="flex min-w-0 items-center gap-2">
          {activeRange && (
            <p className="flex min-w-0 items-center gap-1.5 text-sm text-secondary">
              <CalendarDaysIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{activeRange.label}</span>
            </p>
          )}
          {filterActive && (
            <Button type="button" variant="ghost" size="sm" onClick={onReset} className="shrink-0">
              Zurücksetzen
            </Button>
          )}
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
    </section>
  )
}
