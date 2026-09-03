import { formatCurrency, formatNumber } from '@/lib/formatters'

export function decimalToNumber(value: { toString(): string } | number): number {
  return typeof value === 'number' ? value : Number(value.toString())
}

/** Anzeige: positive Ausgaben als Kosten, negative als Erstattung/Gutschrift. */
export function formatSplitExpenseAmount(amount: number): string {
  return formatCurrency(-amount)
}

export function splitExpenseAmountClass(amount: number): string {
  if (amount < -0.005) return 'text-income'
  if (amount > 0.005) return 'text-expense'
  return 'text-secondary'
}

export function formatForeignCurrency(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currencyCode,
    }).format(amount)
  } catch {
    return `${formatNumber(amount)} ${currencyCode}`
  }
}

export function hasForeignOriginal(expense: {
  originalAmount: number | null
  originalCurrencyCode: string | null
}): boolean {
  return (
    expense.originalAmount != null &&
    expense.originalCurrencyCode != null &&
    expense.originalCurrencyCode !== 'EUR'
  )
}

export function formatSplitExpenseExchangeTooltip(expense: {
  originalCurrencyCode: string | null
  exchangeRate: number | null
  exchangeRateDate: string | null
}): string | null {
  if (
    expense.exchangeRate == null ||
    !expense.originalCurrencyCode ||
    !expense.exchangeRateDate
  ) {
    return null
  }
  const rateFormatted = formatNumber(expense.exchangeRate, 4)
  const dateFormatted = new Date(expense.exchangeRateDate).toLocaleDateString('de-DE')
  return `1 ${expense.originalCurrencyCode} = ${rateFormatted} € (${dateFormatted})`
}
