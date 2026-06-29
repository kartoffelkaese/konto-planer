import { formatCurrency } from '@/lib/formatters'

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

export function splitExpenseAmountLabel(amount: number): string {
  if (amount < -0.005) return 'Erstattung'
  if (amount > 0.005) return 'Ausgabe'
  return 'Neutral'
}
