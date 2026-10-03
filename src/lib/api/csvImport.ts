import { apiFetch } from './client'

export type CsvImportPreviewMerchant = {
  id: string
  name: string
  categoryIds?: string[]
  categories?: Array<{ id: string; name: string; color: string }>
}

export type CsvImportPreviewRow = {
  rowIndex: number
  date: string | null
  amount: number | null
  description: string
  merchantRaw: string
  merchantId: string | null
  merchantName: string | null
  matchConfidence: 'exact' | 'contains' | 'similar' | null
  categoryId: string | null
  isConfirmed: boolean
  isDuplicate: boolean
  duplicateTransactionId: string | null
  canConfirmDuplicate: boolean
  isRecurringMatch: boolean
  recurringMatchKind: 'confirmExisting' | 'createAndConfirm' | 'alreadyBooked' | 'none'
  recurringTemplateId: string | null
  recurringInstanceId: string | null
  canConfirmRecurring: boolean
  errors: string[]
  suggestedIncluded: boolean
  suggestedConfirm: boolean
  suggestedConfirmRecurring: boolean
}

export type CsvImportPreviewResponse = {
  formatId: string
  formatLabel: string
  bankId: string | null
  bankName: string | null
  headerMismatch?: boolean
  availableFormats: Array<{ id: string; label: string }>
  rows: CsvImportPreviewRow[]
  merchants: CsvImportPreviewMerchant[]
  summary: {
    total: number
    duplicates: number
    recurring: number
    errors: number
    suggested: number
    confirmable: number
    dateRange: { start: string; end: string } | null
  }
}

export type CsvImportPreviewOptions = {
  csvText: string
  formatId?: string
}

export type CsvImportCommitRow = {
  rowIndex: number
  confirmExistingId?: string
  confirmRecurringTemplateId?: string
  date?: string
  amount?: number
  description?: string | null
  merchantId?: string | null
  merchant?: string | null
  createNewMerchant?: boolean
  categoryId?: string | null
  isConfirmed?: boolean
}

export const previewCsvImport = async (
  csvText: string,
  options?: { formatId?: string }
): Promise<CsvImportPreviewResponse> => {
  return apiFetch<CsvImportPreviewResponse>('/transactions/import/preview', {
    method: 'POST',
    body: JSON.stringify({
      csvText,
      ...(options?.formatId ? { formatId: options.formatId } : {}),
    }),
  })
}

export const commitCsvImport = async (
  rows: CsvImportCommitRow[]
): Promise<{
  created: number
  confirmed: number
  skipped: number
  errors: Array<{ rowIndex: number; message: string }>
}> => {
  return apiFetch('/transactions/import', {
    method: 'POST',
    body: JSON.stringify({ rows }),
  })
}
