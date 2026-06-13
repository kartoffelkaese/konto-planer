import type { CsvImportFormat, ParsedCsvRow } from '../types'
import { getCell, requiresColumns } from '../columnMap'
import { parseGermanAmount } from '../parseAmount'
import { parseGermanDate } from '../parseDate'

const COL_DATE = ['Datum', 'Buchung', 'buchung']
const COL_COUNTERPARTY = [
  'Empfänger/Auftraggeber',
  'Empfänger / Auftraggeber',
  'Auftraggeber/Empfänger',
  'Auftraggeber / Empfänger',
]
const COL_BOOKING_TEXT = ['Buchungstext', 'buchungstext']
const COL_PURPOSE = ['Verwendungszweck', 'verwendungszweck']
const COL_AMOUNT = ['Betrag', 'betrag']

export const ING_HEADER_MARKERS = ['datum', 'buchung']

export function detectIngExportFormat(headers: string[]): boolean {
  const hasIngLayout = requiresColumns(
    headers,
    COL_DATE,
    COL_COUNTERPARTY,
    COL_AMOUNT
  )
  if (!hasIngLayout) return false
  // DKB hat Umsatztyp – ING nicht
  const normalized = headers.map((h) => h.trim().toLowerCase())
  return !normalized.some((h) => h === 'umsatztyp')
}

function parseIngExportRow(
  row: Record<string, string>,
  rowIndex: number
): ParsedCsvRow {
  const errors: string[] = []

  const dateRaw = getCell(row, COL_DATE)
  const date = parseGermanDate(dateRaw)
  if (!dateRaw) errors.push('Datum fehlt')
  else if (!date) errors.push(`Ungültiges Datum: ${dateRaw}`)

  const merchantRaw = getCell(row, COL_COUNTERPARTY)
  if (!merchantRaw) errors.push('Empfänger/Auftraggeber fehlt')

  const purpose = getCell(row, COL_PURPOSE)
  const bookingText = getCell(row, COL_BOOKING_TEXT)
  const description = purpose || bookingText

  const amountRaw = getCell(row, COL_AMOUNT)
  let amount = parseGermanAmount(amountRaw)
  if (!amountRaw) errors.push('Betrag fehlt')
  else if (amount === null) errors.push(`Ungültiger Betrag: ${amountRaw}`)

  const umsatztyp =
    amount !== null && amount < 0 ? 'ausgang' : amount !== null ? 'eingang' : ''

  return {
    rowIndex,
    date,
    amount,
    description,
    merchantRaw,
    isConfirmed: true,
    umsatztyp,
    errors,
  }
}

export const ingExportFormat: CsvImportFormat = {
  id: 'ingExport',
  label: 'ING Kontoumsätze',
  headerMarkers: ING_HEADER_MARKERS,
  detect: detectIngExportFormat,
  parseRow: parseIngExportRow,
}
