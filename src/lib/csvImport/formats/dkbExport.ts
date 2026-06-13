import type { CsvImportFormat, ParsedCsvRow } from '../types'
import { getCell, normalizeHeader, requiresColumns } from '../columnMap'
import { parseGermanAmount } from '../parseAmount'
import { parseGermanDate } from '../parseDate'
import { parseZeitraumFromCsv } from '../dateRange'

const COL_BOOKING_DATE = ['Buchungsdatum', 'buchungsdatum']
const COL_STATUS = ['Status', 'status']
const COL_PAYER = [
  'Zahlungspflichtige*r',
  'Zahlungspflichtiger',
  'Zahlungspflichtige',
  'zahlungspflichtige*r',
]
const COL_PAYEE = [
  'Zahlungsempfänger*in',
  'Zahlungsempfänger',
  'Zahlungsempfaenger',
  'zahlungsempfänger*in',
]
const COL_PURPOSE = ['Verwendungszweck', 'verwendungszweck']
const COL_TYPE = ['Umsatztyp', 'umsatztyp']
const COL_AMOUNT = ['Betrag (€)', 'Betrag', 'betrag (€)', 'betrag']

export const DKB_HEADER_MARKERS = ['buchungsdatum']

export function detectDkbExportFormat(headers: string[]): boolean {
  return requiresColumns(headers, COL_BOOKING_DATE, COL_TYPE, COL_AMOUNT)
}

function parseDkbExportRow(
  row: Record<string, string>,
  rowIndex: number
): ParsedCsvRow {
  const errors: string[] = []

  const dateRaw = getCell(row, COL_BOOKING_DATE)
  const date = parseGermanDate(dateRaw)
  if (!dateRaw) errors.push('Buchungsdatum fehlt')
  else if (!date) errors.push(`Ungültiges Buchungsdatum: ${dateRaw}`)

  const umsatztyp = getCell(row, COL_TYPE).toLowerCase()
  if (!umsatztyp) errors.push('Umsatztyp fehlt')
  else if (umsatztyp !== 'eingang' && umsatztyp !== 'ausgang') {
    errors.push(`Unbekannter Umsatztyp: ${umsatztyp}`)
  }

  const payer = getCell(row, COL_PAYER)
  const payee = getCell(row, COL_PAYEE)
  let merchantRaw = ''
  if (umsatztyp === 'eingang') merchantRaw = payer
  else if (umsatztyp === 'ausgang') merchantRaw = payee
  if (!merchantRaw) errors.push('Händler (Zahlungspartner) fehlt')

  const description = getCell(row, COL_PURPOSE)

  const amountRaw = getCell(row, COL_AMOUNT)
  let amount = parseGermanAmount(amountRaw)
  if (!amountRaw) errors.push('Betrag fehlt')
  else if (amount === null) errors.push(`Ungültiger Betrag: ${amountRaw}`)
  else if (amount > 0 && umsatztyp === 'ausgang') amount = -amount
  else if (amount < 0 && umsatztyp === 'eingang') amount = Math.abs(amount)

  const statusRaw = getCell(row, COL_STATUS).toLowerCase()
  const isConfirmed = statusRaw === 'gebucht'

  return {
    rowIndex,
    date,
    amount,
    description,
    merchantRaw,
    isConfirmed,
    umsatztyp,
    errors,
  }
}

export const dkbExportFormat: CsvImportFormat = {
  id: 'dkbExport',
  label: 'DKB Kontoumsätze',
  headerMarkers: DKB_HEADER_MARKERS,
  detect: detectDkbExportFormat,
  parseMetadata: parseZeitraumFromCsv,
  parseRow: parseDkbExportRow,
}
