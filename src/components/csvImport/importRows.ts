import type { CsvImportCommitRow, CsvImportPreviewRow } from '@/lib/api'

export type EditableImportRow = CsvImportPreviewRow & {
  included: boolean
  confirmIncluded: boolean
  createNewMerchant: boolean
}

export type ImportSummary = {
  total: number
  duplicates: number
  recurring: number
  errors: number
  suggested: number
  confirmable: number
  dateRange: { start: string; end: string } | null
}

export type ImportFormatMeta = {
  formatId: string
  formatLabel: string
  bankId: string | null
  bankName: string | null
  headerMismatch?: boolean
  availableFormats: Array<{ id: string; label: string }>
}

export const NEW_MERCHANT_VALUE = '__new__'

export function matchHint(confidence: CsvImportPreviewRow['matchConfidence']): string | null {
  switch (confidence) {
    case 'exact':
      return 'Händler exakt erkannt'
    case 'contains':
      return 'Händler im Text erkannt'
    case 'similar':
      return 'Ähnlicher Händler vorgeschlagen'
    default:
      return null
  }
}

export function rowIsValid(row: EditableImportRow): boolean {
  return (
    row.errors.length === 0 &&
    !!row.date &&
    row.amount !== null &&
    (!!row.merchantId || (row.createNewMerchant && !!row.merchantName?.trim()))
  )
}

export function rowCanConfirm(row: EditableImportRow): boolean {
  if (row.canConfirmRecurring) {
    return (
      row.recurringMatchKind === 'confirmExisting' ||
      row.recurringMatchKind === 'createAndConfirm'
    )
  }
  return row.canConfirmDuplicate && !!row.duplicateTransactionId
}

export function recurringMatchLabel(row: EditableImportRow): string {
  switch (row.recurringMatchKind) {
    case 'confirmExisting':
      return 'Wiederkehrend – Instanz bestätigen'
    case 'createAndConfirm':
      return 'Wiederkehrend – Instanz anlegen und bestätigen'
    case 'alreadyBooked':
      return 'Wiederkehrend – bereits gebucht'
    default:
      return 'Wiederkehrend'
  }
}

export function recurringConfirmTitle(row: EditableImportRow): string {
  if (row.recurringMatchKind === 'createAndConfirm') {
    return 'Wiederkehrende Instanz anlegen und bestätigen'
  }
  return 'Wiederkehrende Instanz bestätigen'
}

export function recurringConfirmDescription(row: EditableImportRow): string {
  if (row.recurringMatchKind === 'createAndConfirm') {
    return 'Es wird keine normale Transaktion importiert – die Instanz für den Gehaltsmonat wird angelegt und als gebucht markiert.'
  }
  return 'Es wird keine neue Transaktion angelegt – die offene wiederkehrende Buchung wird als gebucht markiert.'
}

export function toEditableRows(rows: CsvImportPreviewRow[]): EditableImportRow[] {
  return rows.map((row) => ({
    ...row,
    included: row.suggestedIncluded,
    confirmIncluded: row.suggestedConfirm || row.suggestedConfirmRecurring,
    createNewMerchant: !row.merchantId && row.errors.length === 0,
    merchantName: row.merchantName ?? row.merchantRaw,
  }))
}

export function rowBorderClass(row: EditableImportRow, valid: boolean): string {
  if (row.errors.length > 0) return 'border-l-danger'
  if (row.confirmIncluded && rowCanConfirm(row)) return 'border-l-income'
  if (row.isRecurringMatch) return 'border-l-pending'
  if (row.isDuplicate) return 'border-l-pending'
  if (row.included && valid) return 'border-l-income'
  return 'border-l-border'
}

/** Zeilen, die als neue Buchung importiert werden */
export function rowsToImport(rows: EditableImportRow[]): EditableImportRow[] {
  return rows.filter((r) => r.included && rowIsValid(r) && !rowCanConfirm(r))
}

/** Zeilen, die eine bestehende (wiederkehrende) Buchung bestätigen */
export function rowsToConfirm(rows: EditableImportRow[]): EditableImportRow[] {
  return rows.filter((r) => r.confirmIncluded && rowCanConfirm(r))
}

/** Baut die Zeilen für den Import-Aufruf: erst Bestätigungen, dann neue Buchungen */
export function buildCommitRows(
  toConfirm: EditableImportRow[],
  toImport: EditableImportRow[]
): CsvImportCommitRow[] {
  return [
    ...toConfirm.map((row) => {
      if (row.canConfirmRecurring && row.recurringMatchKind === 'createAndConfirm') {
        return {
          rowIndex: row.rowIndex,
          confirmRecurringTemplateId: row.recurringTemplateId!,
          date: row.date!,
          amount: row.amount!,
        }
      }
      if (row.canConfirmRecurring && row.recurringInstanceId) {
        return {
          rowIndex: row.rowIndex,
          confirmExistingId: row.recurringInstanceId,
        }
      }
      return {
        rowIndex: row.rowIndex,
        confirmExistingId: row.duplicateTransactionId!,
      }
    }),
    ...toImport.map((row) => ({
      rowIndex: row.rowIndex,
      date: row.date!,
      amount: row.amount!,
      description: row.description || null,
      merchantId: row.createNewMerchant ? null : row.merchantId,
      merchant: row.createNewMerchant
        ? row.merchantName?.trim() || row.merchantRaw
        : row.merchantId
          ? undefined
          : row.merchantName?.trim() || row.merchantRaw,
      createNewMerchant: row.createNewMerchant,
      categoryId: row.categoryId || null,
      isConfirmed: row.isConfirmed,
    })),
  ]
}
