'use client'

import {
  formatForeignCurrency,
  formatSplitExpenseAmount,
  formatSplitExpenseExchangeTooltip,
  hasForeignOriginal,
  splitExpenseAmountClass,
} from '@/lib/splitFormatters'

type SplitAmountDisplayProps = {
  amount: number
  originalAmount?: number | null
  originalCurrencyCode?: string | null
  exchangeRate?: number | null
  exchangeRateDate?: string | null
  className?: string
}

export default function SplitAmountDisplay({
  amount,
  originalAmount = null,
  originalCurrencyCode = null,
  exchangeRate = null,
  exchangeRateDate = null,
  className = '',
}: SplitAmountDisplayProps) {
  const expense = {
    amount,
    originalAmount,
    originalCurrencyCode,
    exchangeRate,
    exchangeRateDate,
  }
  const showForeign = hasForeignOriginal(expense)
  const tooltip = showForeign ? formatSplitExpenseExchangeTooltip(expense) : null

  return (
    <span
      className={`inline-flex flex-col items-end gap-0.5 ${className}`}
      title={tooltip ?? undefined}
    >
      <span className={`tabular-nums ${splitExpenseAmountClass(amount)}`}>
        {formatSplitExpenseAmount(amount)}
      </span>
      {showForeign && originalAmount != null && originalCurrencyCode && (
        <span className="text-xs tabular-nums text-secondary leading-tight">
          {formatForeignCurrency(originalAmount, originalCurrencyCode)}
        </span>
      )}
    </span>
  )
}
