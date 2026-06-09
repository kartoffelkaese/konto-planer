import type { CsvImportFormat, ParsedCsvRow } from '../types'
import { parseGermanAmount } from '../parseAmount'
import { parseGermanDate } from '../parseDate'

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
}

function findColumnKey(
  row: Record<string, string>,
  candidates: string[]
): string | undefined {
  const keys = Object.keys(row)
  for (const candidate of candidates) {
    const normCandidate = normalizeHeader(candidate)
    const found = keys.find((k) => normalizeHeader(k) === normCandidate)
    if (found) return found
  }
  return undefined
}

function getCell(row: Record<string, string>, candidates: string[]): string {
  const key = findColumnKey(row, candidates)
  return key ? (row[key] ?? '').trim() : ''
}

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

export function detectStandardBankFormat(headers: string[]): boolean {
  const normalized = headers.map(normalizeHeader)
  const hasDate = normalized.some((h) =>
    COL_BOOKING_DATE.some((c) => normalizeHeader(c) === h)
  )
  const hasType = normalized.some((h) =>
    COL_TYPE.some((c) => normalizeHeader(c) === h)
  )
  const hasAmount = normalized.some((h) =>
    COL_AMOUNT.some((c) => normalizeHeader(c) === h)
  )
  return hasDate && hasType && hasAmount
}

function parseStandardBankRow(
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

export const standardBankFormat: CsvImportFormat = {
  id: 'standardBank',
  label: 'Standard-Bankexport',
  detect: detectStandardBankFormat,
  parseRow: parseStandardBankRow,
}
