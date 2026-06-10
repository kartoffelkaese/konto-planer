import type { CsvImportFormatId, CsvParseResult } from './types'
import { parseDelimitedCsv } from './parseDelimited'
import { standardBankFormat } from './formats/standardBank'

const FORMATS = [standardBankFormat]

/** Parse-Fehler mit Meldung, die dem Nutzer angezeigt werden darf. */
export class CsvParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CsvParseError'
  }
}

export function detectCsvFormat(headers: string[]): CsvImportFormatId | null {
  const format = FORMATS.find((f) => f.detect(headers))
  return format?.id ?? null
}

export function parseCsv(csvText: string): CsvParseResult {
  const { headers, records } = parseDelimitedCsv(csvText)

  if (headers.length === 0) {
    throw new CsvParseError('Die CSV-Datei enthält keine Kopfzeile.')
  }

  const format = FORMATS.find((f) => f.detect(headers))
  if (!format) {
    throw new CsvParseError(
      'Unbekanntes CSV-Format. Erwartete Spalten: Buchungsdatum, Status, Zahlungspflichtige*r, Zahlungsempfänger*in, Verwendungszweck, Umsatztyp, Betrag (€).'
    )
  }

  const rows = records.map((record, index) =>
    format.parseRow(record, index + 1)
  )

  return { formatId: format.id, rows }
}

export { standardBankFormat } from './formats/standardBank'
export type {
  CsvImportFormatId,
  ParsedCsvRow,
  ImportPreviewRow,
  ImportCommitRow,
} from './types'
