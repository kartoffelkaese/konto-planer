import { normalizeMerchantName } from '@/lib/merchantMatching'

export type ExistingTransactionForDuplicateCheck = {
  date: Date
  amount: number | { toString(): string }
  merchantId: string | null
  merchant: string
}

export type DuplicateCheckInput = {
  date: Date
  amount: number
  merchantId: string | null
  merchantName: string | null
}

function sameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function sameAmount(a: number, b: number | { toString(): string }): boolean {
  return Math.abs(a - Number(b)) < 0.001
}

function sameMerchant(
  input: DuplicateCheckInput,
  existing: ExistingTransactionForDuplicateCheck
): boolean {
  if (input.merchantId && existing.merchantId) {
    return input.merchantId === existing.merchantId
  }
  const left = normalizeMerchantName(input.merchantName ?? '')
  const right = normalizeMerchantName(existing.merchant)
  return left.length > 0 && left === right
}

export function isDuplicateTransaction(
  input: DuplicateCheckInput,
  existing: ExistingTransactionForDuplicateCheck[]
): boolean {
  return existing.some(
    (tx) =>
      sameCalendarDay(input.date, tx.date) &&
      sameAmount(input.amount, tx.amount) &&
      sameMerchant(input, tx)
  )
}
