import { findMerchantInBankTexts } from '@/lib/merchantMatching'
import { suggestCategoryIdForMerchant } from '@/lib/suggestCategoryId'
import { findDuplicateTransaction } from './duplicates'
import { formatDateIso } from './parseDate'
import type { ImportPreviewRow, ParsedCsvRow } from './types'

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
}

export function buildImportPreviewRows(
  parsedRows: ParsedCsvRow[],
  merchants: MerchantForPreview[],
  existingTransactions: ExistingTxForDuplicate[]
): ImportPreviewRow[] {
  return parsedRows.map((row) => {
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

    let duplicateMatch = null as ReturnType<typeof findDuplicateTransaction>
    if (
      isValid &&
      row.date &&
      row.amount !== null &&
      (merchantId || merchantName || row.merchantRaw)
    ) {
      duplicateMatch = findDuplicateTransaction(
        {
          date: row.date,
          amount: row.amount,
          merchantId,
          merchantName: merchantName ?? row.merchantRaw,
        },
        existingTransactions
      )
    }

    const isDuplicate = duplicateMatch !== null
    const canConfirmDuplicate =
      isDuplicate &&
      row.isConfirmed &&
      duplicateMatch !== null &&
      !duplicateMatch.isConfirmed

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
      errors,
      suggestedIncluded: !hasBlockingErrors && !isDuplicate,
      suggestedConfirm: canConfirmDuplicate,
    }
  })
}
