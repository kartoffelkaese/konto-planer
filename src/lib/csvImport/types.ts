import type { ImportDateRange } from './dateRange'

export type CsvImportFormatId = 'dkbExport' | 'ingExport'

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

export type RecurringMatchKind =
  | 'confirmExisting'
  | 'createAndConfirm'
  | 'alreadyBooked'
  | 'none'

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
  isRecurringMatch: boolean
  recurringMatchKind: RecurringMatchKind
  recurringTemplateId: string | null
  recurringInstanceId: string | null
  canConfirmRecurring: boolean
  errors: string[]
  /** Server-Vorschlag: importieren (gültig, kein Duplikat, kein Wiederkehrend-Match) */
  suggestedIncluded: boolean
  /** Server-Vorschlag: bestehende offene Buchung bestätigen */
  suggestedConfirm: boolean
  /** Server-Vorschlag: wiederkehrende Instanz bestätigen oder anlegen */
  suggestedConfirmRecurring: boolean
}

export type ImportCommitRow = {
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

export type CsvImportFormat = {
  id: CsvImportFormatId
  label: string
  detect: (headers: string[]) => boolean
  parseRow: (
    row: Record<string, string>,
    rowIndex: number
  ) => ParsedCsvRow
  /** Kopfzeilen-Marker (normalisiert) – mindestens einer pro Zeile */
  headerMarkers?: string[]
  /** Metadaten-Zeilen vor der Tabelle (z. B. Zeitraum) */
  parseMetadata?: (csvText: string) => ImportDateRange | null
  /** Zeilen überspringen (Summen, leere Zeilen) */
  skipRow?: (row: Record<string, string>) => boolean
}

export type CsvParseResult = {
  formatId: CsvImportFormatId
  formatLabel: string
  rows: ParsedCsvRow[]
  headerMismatch?: boolean
}

export type ParseCsvOptions = {
  formatId?: CsvImportFormatId
  bankId?: string | null
}
