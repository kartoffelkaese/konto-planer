import { findMerchantInBankTexts } from '@/lib/merchantMatching'
import { suggestCategoryIdForMerchant } from '@/lib/suggestCategoryId'
import { findDuplicateTransaction } from './duplicates'
import { formatDateIso } from './parseDate'
import {
  findRecurringCsvMatch,
  sortImportPreviewRowsByDate,
  type RecurringInstanceForMatch,
  type RecurringTemplateForMatch,
} from './recurringMatch'
import type { ImportPreviewRow, ParsedCsvRow, RecurringMatchKind } from './types'

export type MerchantForPreview = {
  id: string
  name: string
  categoryIds?: string[]
  categories?: Array<{ id: string }>
}

export type ExistingTxForDuplicate = {
  id: string
  date: Date
  amount: number | { toString(): string }
  merchantId: string | null
  merchant: string
  isConfirmed: boolean
  parentTransactionId?: string | null
}

export type BuildImportPreviewOptions = {
  salaryDay?: number | null
  enableRecurringMatch?: boolean
  recurringTemplates?: RecurringTemplateForMatch[]
  recurringInstances?: RecurringInstanceForMatch[]
}

export function buildImportPreviewRows(
  parsedRows: ParsedCsvRow[],
  merchants: MerchantForPreview[],
  existingTransactions: ExistingTxForDuplicate[],
  options: BuildImportPreviewOptions = {}
): ImportPreviewRow[] {
  const {
    salaryDay = null,
    enableRecurringMatch = false,
    recurringTemplates = [],
    recurringInstances = [],
  } = options

  const rows = parsedRows.map((row) => {
    const errors = [...row.errors]
    let merchantId: string | null = null
    let merchantName: string | null = null
    let matchConfidence: ImportPreviewRow['matchConfidence'] = null
    let categoryId: string | null = null

    if (errors.length === 0) {
      const searchTexts = [row.merchantRaw]
      const purpose = row.description.trim()
      if (purpose && purpose !== row.merchantRaw.trim()) {
        searchTexts.push(purpose)
      }
      const match = findMerchantInBankTexts(merchants, searchTexts)
      if (match) {
        merchantId = match.merchant.id
        merchantName = match.merchant.name
        matchConfidence = match.confidence
        categoryId = suggestCategoryIdForMerchant(match.merchant)
      }
    }

    const isValid =
      errors.length === 0 &&
      row.date !== null &&
      row.amount !== null &&
      row.merchantRaw.trim().length > 0

    let recurringMatchKind: RecurringMatchKind = 'none'
    let recurringTemplateId: string | null = null
    let recurringInstanceId: string | null = null

    if (
      enableRecurringMatch &&
      isValid &&
      row.date &&
      row.amount !== null &&
      salaryDay != null &&
      (merchantId || merchantName || row.merchantRaw)
    ) {
      const recurringMatch = findRecurringCsvMatch(
        {
          date: row.date,
          amount: row.amount,
          merchantId,
          merchantName: merchantName ?? row.merchantRaw,
          csvIsConfirmed: row.isConfirmed,
        },
        recurringTemplates,
        recurringInstances,
        salaryDay
      )
      recurringMatchKind = recurringMatch.kind
      recurringTemplateId = recurringMatch.templateId
      recurringInstanceId = recurringMatch.instanceId
    }

    const isRecurringMatch = recurringMatchKind !== 'none'

    let duplicateMatch = null as ReturnType<typeof findDuplicateTransaction>
    if (
      !isRecurringMatch &&
      isValid &&
      row.date &&
      row.amount !== null &&
      (merchantId || merchantName || row.merchantRaw)
    ) {
      const nonRecurringExisting = existingTransactions.filter(
        (tx) => !tx.parentTransactionId
      )
      duplicateMatch = findDuplicateTransaction(
        {
          date: row.date,
          amount: row.amount,
          merchantId,
          merchantName: merchantName ?? row.merchantRaw,
        },
        nonRecurringExisting
      )
    }

    const isDuplicate = duplicateMatch !== null
    const canConfirmDuplicate =
      !isRecurringMatch &&
      isDuplicate &&
      row.isConfirmed &&
      duplicateMatch !== null &&
      !duplicateMatch.isConfirmed

    const canConfirmRecurring =
      isRecurringMatch &&
      row.isConfirmed &&
      (recurringMatchKind === 'confirmExisting' ||
        recurringMatchKind === 'createAndConfirm')

    const hasBlockingErrors =
      errors.length > 0 || row.date === null || row.amount === null

    return {
      rowIndex: row.rowIndex,
      date: row.date ? formatDateIso(row.date) : null,
      amount: row.amount,
      description: row.description,
      merchantRaw: row.merchantRaw,
      merchantId,
      merchantName,
      matchConfidence,
      categoryId,
      isConfirmed: row.isConfirmed,
      isDuplicate,
      duplicateTransactionId: duplicateMatch?.id ?? null,
      canConfirmDuplicate,
      isRecurringMatch,
      recurringMatchKind,
      recurringTemplateId,
      recurringInstanceId,
      canConfirmRecurring,
      errors,
      suggestedIncluded: !hasBlockingErrors && !isDuplicate && !isRecurringMatch,
      suggestedConfirm: canConfirmDuplicate,
      suggestedConfirmRecurring: canConfirmRecurring,
    }
  })

  return sortImportPreviewRowsByDate(rows)
}

export { sortImportPreviewRowsByDate }
