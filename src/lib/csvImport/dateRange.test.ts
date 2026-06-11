import { describe, expect, it } from 'vitest'
import {
  getImportDateRange,
  parseZeitraumFromCsv,
  toImportDateRangeIso,
} from './dateRange'

const EXAMPLE_METADATA_CSV = `"Girokonto";"DE76120300001014477242"
"Zeitraum:";"10.06.2026 - 11.06.2026"
"Kontostand vom 11.06.2026:";"459,91 €"
""`

describe('parseZeitraumFromCsv', () => {
  it('parst Zeitraum aus Bank-Metadaten', () => {
    const range = parseZeitraumFromCsv(EXAMPLE_METADATA_CSV)
    expect(range).not.toBeNull()
    expect(range!.start.getFullYear()).toBe(2026)
    expect(range!.start.getMonth()).toBe(5)
    expect(range!.start.getDate()).toBe(10)
    expect(range!.end.getDate()).toBe(11)
  })
})

describe('getImportDateRange', () => {
  it('nutzt Min/Max über alle Buchungszeilen', () => {
    const range = getImportDateRange([
      { date: new Date(2026, 0, 15, 12, 0, 0) },
      { date: new Date(2026, 11, 3, 12, 0, 0) },
      { date: new Date(2026, 5, 1, 12, 0, 0) },
    ])
    expect(range).not.toBeNull()
    expect(range!.start.getMonth()).toBe(0)
    expect(range!.start.getDate()).toBe(15)
    expect(range!.end.getMonth()).toBe(11)
    expect(range!.end.getDate()).toBe(3)
  })

  it('fällt auf Zeitraum-Metadaten zurück ohne gültige Zeilen', () => {
    const range = getImportDateRange(
      [{ date: null }, { date: null }],
      EXAMPLE_METADATA_CSV
    )
    expect(range).not.toBeNull()
    expect(range!.start.getDate()).toBe(10)
    expect(range!.end.getDate()).toBe(11)
  })

  it('liefert null ohne Daten und ohne Zeitraum', () => {
    expect(getImportDateRange([{ date: null }])).toBeNull()
    expect(getImportDateRange([], 'nur kopfzeile')).toBeNull()
  })

  it('bevorzugt Buchungsdaten gegenüber breiterem Metadaten-Zeitraum', () => {
    const range = getImportDateRange(
      [{ date: new Date(2026, 5, 11, 12, 0, 0) }],
      EXAMPLE_METADATA_CSV
    )
    expect(range!.start.getDate()).toBe(11)
    expect(range!.end.getDate()).toBe(11)
  })
})

describe('toImportDateRangeIso', () => {
  it('formatiert als ISO-Datum', () => {
    expect(
      toImportDateRangeIso({
        start: new Date(2026, 5, 10, 12, 0, 0),
        end: new Date(2026, 5, 11, 12, 0, 0),
      })
    ).toEqual({ start: '2026-06-10', end: '2026-06-11' })
  })
})
