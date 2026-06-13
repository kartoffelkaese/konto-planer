import type { GermanBankId } from '@/lib/germanBanks'
import type { CsvImportFormatId } from './types'

/** n:1 Zuordnung Bank → CSV-Export-Format. Banken ohne Eintrag: Import nicht unterstützt. */
export const BANK_CSV_FORMAT: Partial<Record<GermanBankId, CsvImportFormatId>> = {
  dkb: 'dkbExport',
  ing: 'ingExport',
}

export function getCsvFormatIdForBank(
  bankId: string | null | undefined
): CsvImportFormatId | null {
  if (!bankId) return null
  return BANK_CSV_FORMAT[bankId as GermanBankId] ?? null
}

export function isCsvImportAvailableForBank(
  bankId: string | null | undefined
): boolean {
  return getCsvFormatIdForBank(bankId) !== null
}
