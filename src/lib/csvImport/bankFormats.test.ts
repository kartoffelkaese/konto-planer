import { describe, expect, it } from 'vitest'
import { parseCsv, CsvParseError } from './index'
import { getCsvFormatIdForBank, isCsvImportAvailableForBank } from './bankFormats'

describe('bankFormats', () => {
  it('ordnet dkb und ing zu', () => {
    expect(getCsvFormatIdForBank('dkb')).toBe('dkbExport')
    expect(getCsvFormatIdForBank('ing')).toBe('ingExport')
  })

  it('gibt null für unbekannte Bank zurück', () => {
    expect(getCsvFormatIdForBank('n26')).toBeNull()
    expect(getCsvFormatIdForBank(null)).toBeNull()
  })

  it('isCsvImportAvailableForBank', () => {
    expect(isCsvImportAvailableForBank('dkb')).toBe(true)
    expect(isCsvImportAvailableForBank('n26')).toBe(false)
    expect(isCsvImportAvailableForBank(null)).toBe(false)
  })
})

describe('parseCsv bankId validation', () => {
  it('wirft Fehler ohne bankId', () => {
    expect(() => parseCsv('a;b\n1;2')).toThrow(CsvParseError)
    expect(() => parseCsv('a;b\n1;2')).toThrow(/Bank in den Einstellungen/)
  })

  it('wirft Fehler für nicht unterstützte Bank', () => {
    expect(() => parseCsv('a;b\n1;2', { bankId: 'n26' })).toThrow(
      /noch nicht unterstützt/
    )
  })
})
