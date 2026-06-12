import { normalizeMerchantName } from '@/lib/merchantMatching'
import {
  getRecurringDueDatesInRange,
  getSalaryMonthRangeForDate,
  type RecurringInterval,
} from '@/lib/dateUtils'

export type RecurringMatchKind =
  | 'confirmExisting'
  | 'createAndConfirm'
  | 'alreadyBooked'
  | 'none'

export type RecurringMatchResult = {
  kind: RecurringMatchKind
  templateId: string | null
  instanceId: string | null
}

export type RecurringTemplateForMatch = {
  id: string
  date: Date
  amount: number | { toString(): string }
  merchantId: string | null
  merchant: string
  recurringInterval: string | null
}

export type RecurringInstanceForMatch = {
  id: string
  date: Date
  amount: number | { toString(): string }
  merchantId: string | null
  merchant: string
  isConfirmed: boolean
  parentTransactionId: string | null
}

export type RecurringCsvMatchInput = {
  date: Date
  amount: number
  merchantId: string | null
  merchantName: string | null
  csvIsConfirmed: boolean
}

function sameAmount(a: number, b: number | { toString(): string }): boolean {
  return Math.abs(a - Number(b)) < 0.001
}

function sameMerchant(
  input: Pick<RecurringCsvMatchInput, 'merchantId' | 'merchantName'>,
  existing: Pick<RecurringTemplateForMatch, 'merchantId' | 'merchant'>
): boolean {
  if (input.merchantId && existing.merchantId) {
    return input.merchantId === existing.merchantId
  }
  const left = normalizeMerchantName(input.merchantName ?? '')
  const right = normalizeMerchantName(existing.merchant)
  return left.length > 0 && left === right
}

export function matchesRecurringTemplateAmountAndMerchant(
  input: RecurringCsvMatchInput,
  template: RecurringTemplateForMatch
): boolean {
  return sameAmount(input.amount, template.amount) && sameMerchant(input, template)
}

function isDateInRange(date: Date, start: Date, end: Date): boolean {
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime()
}

export function findRecurringCsvMatch(
  input: RecurringCsvMatchInput,
  templates: RecurringTemplateForMatch[],
  instances: RecurringInstanceForMatch[],
  salaryDay: number
): RecurringMatchResult {
  if (!input.csvIsConfirmed) {
    return { kind: 'none', templateId: null, instanceId: null }
  }

  const { startDate, endDate } = getSalaryMonthRangeForDate(salaryDay, input.date)

  const matchingTemplates = templates
    .filter((t) => matchesRecurringTemplateAmountAndMerchant(input, t))
    .filter((t) => {
      const interval = (t.recurringInterval || 'monthly') as RecurringInterval
      return (
        getRecurringDueDatesInRange(t.date, interval, startDate, endDate).length >
        0
      )
    })
    .sort((a, b) => a.id.localeCompare(b.id))

  if (matchingTemplates.length === 0) {
    return { kind: 'none', templateId: null, instanceId: null }
  }

  const template = matchingTemplates[0]!

  const instancesInMonth = instances.filter(
    (i) =>
      i.parentTransactionId === template.id &&
      isDateInRange(i.date, startDate, endDate)
  )

  if (instancesInMonth.length > 0) {
    const openInstance = instancesInMonth.find((i) => !i.isConfirmed)
    if (openInstance) {
      return {
        kind: 'confirmExisting',
        templateId: template.id,
        instanceId: openInstance.id,
      }
    }
    return {
      kind: 'alreadyBooked',
      templateId: template.id,
      instanceId: instancesInMonth[0]!.id,
    }
  }

  return {
    kind: 'createAndConfirm',
    templateId: template.id,
    instanceId: null,
  }
}

export function sortImportPreviewRowsByDate<
  T extends { date: string | null; rowIndex: number },
>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (!a.date && !b.date) return a.rowIndex - b.rowIndex
    if (!a.date) return 1
    if (!b.date) return -1
    const cmp = a.date.localeCompare(b.date)
    return cmp !== 0 ? cmp : a.rowIndex - b.rowIndex
  })
}
