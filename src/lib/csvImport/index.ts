import type {
  CsvImportFormat,
  CsvImportFormatId,
  CsvParseResult,
  ParseCsvOptions,
} from './types'
import { getCsvFormatIdForBank } from './bankFormats'
import { collectHeaderMarkers, parseDelimitedCsv } from './parseDelimited'
import { dkbExportFormat } from './formats/dkbExport'
import { ingExportFormat } from './formats/ingExport'
import { getBankById } from '@/lib/germanBanks'

const FORMATS: CsvImportFormat[] = [dkbExportFormat, ingExportFormat]

const ALL_HEADER_MARKERS = collectHeaderMarkers(
  FORMATS.map((f) => f.headerMarkers)
)

/** Parse-Fehler mit Meldung, die dem Nutzer angezeigt werden darf. */
export class CsvParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CsvParseError'
  }
}

export function listCsvFormats(): Array<{ id: CsvImportFormatId; label: string }> {
  return FORMATS.map((f) => ({ id: f.id, label: f.label }))
}

export function getCsvFormatById(
  formatId: CsvImportFormatId
): CsvImportFormat | undefined {
  return FORMATS.find((f) => f.id === formatId)
}

export function getCsvFormatForBank(
  bankId: string | null | undefined
): CsvImportFormat | null {
  const formatId = getCsvFormatIdForBank(bankId)
  if (!formatId) return null
  return getCsvFormatById(formatId) ?? null
}

export function detectCsvFormat(headers: string[]): CsvImportFormatId | null {
  const format = FORMATS.find((f) => f.detect(headers))
  return format?.id ?? null
}

function resolveFormat(options?: ParseCsvOptions): CsvImportFormat {
  if (options?.formatId) {
    const format = getCsvFormatById(options.formatId)
    if (!format) {
      throw new CsvParseError(`Unbekanntes CSV-Format: ${options.formatId}`)
    }
    return format
  }

  const bankId = options?.bankId
  if (!bankId) {
    throw new CsvParseError(
      'Bitte wählen Sie Ihre Bank in den Einstellungen, um CSV-Dateien importieren zu können.'
    )
  }

  const format = getCsvFormatForBank(bankId)
  if (!format) {
    const bank = getBankById(bankId)
    const bankName = bank?.name ?? 'Diese Bank'
    throw new CsvParseError(
      `CSV-Import für ${bankName} wird noch nicht unterstützt.`
    )
  }

  return format
}

function formatExpectedColumnsHint(format: CsvImportFormat): string {
  return `Erwartetes Format: ${format.label}.`
}

export function parseCsv(
  csvText: string,
  options?: ParseCsvOptions
): CsvParseResult {
  const format = resolveFormat(options)
  const headerMarkers =
    format.headerMarkers && format.headerMarkers.length > 0
      ? collectHeaderMarkers([format.headerMarkers, ALL_HEADER_MARKERS])
      : ALL_HEADER_MARKERS

  const { headers, records } = parseDelimitedCsv(csvText, { headerMarkers })

  if (headers.length === 0) {
    throw new CsvParseError('Die CSV-Datei enthält keine Kopfzeile.')
  }

  const headerMismatch = !format.detect(headers)

  const rows = records
    .filter((record) => !format.skipRow?.(record))
    .map((record, index) => format.parseRow(record, index + 1))

  if (rows.length === 0 && !headerMismatch) {
    throw new CsvParseError(
      `Die CSV-Datei enthält keine Buchungszeilen. ${formatExpectedColumnsHint(format)}`
    )
  }

  return {
    formatId: format.id,
    formatLabel: format.label,
    rows,
    ...(headerMismatch ? { headerMismatch: true } : {}),
  }
}

export { dkbExportFormat } from './formats/dkbExport'
export { ingExportFormat } from './formats/ingExport'
export { getCsvFormatIdForBank, BANK_CSV_FORMAT, isCsvImportAvailableForBank } from './bankFormats'
export type {
  CsvImportFormatId,
  ParsedCsvRow,
  ImportPreviewRow,
  ImportCommitRow,
  ParseCsvOptions,
} from './types'
