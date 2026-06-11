export type CsvImportFormatId = 'standardBank'

/** Obergrenze für hochgeladene CSV-Inhalte (Schutz vor DoS). */
export const CSV_IMPORT_MAX_BYTES = 2 * 1024 * 1024

/** Max. Zeilen pro Import-Commit (Schutz vor DoS über Massen-Inserts). */
export const CSV_IMPORT_MAX_ROWS = 5000

export type ParsedCsvRow = {
  rowIndex: number
  date: Date | null
  amount: number | null
  description: string
  merchantRaw: string
  isConfirmed: boolean
  umsatztyp: string
  errors: string[]
}

export type MerchantMatchConfidence = 'exact' | 'contains' | 'similar' | null

export type ImportPreviewRow = {
  rowIndex: number
  date: string | null
  amount: number | null
  description: string
  merchantRaw: string
  merchantId: string | null
  merchantName: string | null
  matchConfidence: MerchantMatchConfidence
  categoryId: string | null
  isConfirmed: boolean
  isDuplicate: boolean
  duplicateTransactionId: string | null
  canConfirmDuplicate: boolean
  errors: string[]
  /** Server-Vorschlag: importieren (gültig, kein Duplikat) */
  suggestedIncluded: boolean
  /** Server-Vorschlag: bestehende offene Buchung bestätigen */
  suggestedConfirm: boolean
}

export type ImportCommitRow = {
  rowIndex: number
  confirmExistingId?: string
  date?: string
  amount?: number
  description?: string | null
  merchantId?: string | null
  merchant?: string | null
  createNewMerchant?: boolean
  categoryId?: string | null
  isConfirmed?: boolean
}

export type CsvImportFormat = {
  id: CsvImportFormatId
  label: string
  detect: (headers: string[]) => boolean
  parseRow: (
    row: Record<string, string>,
    rowIndex: number
  ) => ParsedCsvRow
}

export type CsvParseResult = {
  formatId: CsvImportFormatId
  rows: ParsedCsvRow[]
}
