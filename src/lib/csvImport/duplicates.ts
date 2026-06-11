import { normalizeMerchantName } from '@/lib/merchantMatching'

export type ExistingTransactionForDuplicateCheck = {
  id: string
  date: Date
  amount: number | { toString(): string }
  merchantId: string | null
  merchant: string
  isConfirmed: boolean
}

export type DuplicateCheckInput = {
  date: Date
  amount: number
  merchantId: string | null
  merchantName: string | null
}

export type DuplicateMatch = {
  id: string
  isConfirmed: boolean
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
  existing: Pick<ExistingTransactionForDuplicateCheck, 'merchantId' | 'merchant'>
): boolean {
  if (input.merchantId && existing.merchantId) {
    return input.merchantId === existing.merchantId
  }
  const left = normalizeMerchantName(input.merchantName ?? '')
  const right = normalizeMerchantName(existing.merchant)
  return left.length > 0 && left === right
}

export function matchesDuplicateCriteria(
  input: DuplicateCheckInput,
  existing: ExistingTransactionForDuplicateCheck
): boolean {
  return (
    sameCalendarDay(input.date, existing.date) &&
    sameAmount(input.amount, existing.amount) &&
    sameMerchant(input, existing)
  )
}

export function findDuplicateTransaction(
  input: DuplicateCheckInput,
  existing: ExistingTransactionForDuplicateCheck[]
): DuplicateMatch | null {
  const match = existing.find((tx) => matchesDuplicateCriteria(input, tx))
  if (!match) return null
  return { id: match.id, isConfirmed: match.isConfirmed }
}

export function isDuplicateTransaction(
  input: DuplicateCheckInput,
  existing: ExistingTransactionForDuplicateCheck[]
): boolean {
  return findDuplicateTransaction(input, existing) !== null
}
