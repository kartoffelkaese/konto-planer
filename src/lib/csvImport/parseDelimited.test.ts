import { describe, expect, it } from 'vitest'
import { parseDelimitedCsv } from './parseDelimited'

describe('parseDelimitedCsv', () => {
  it('findet Kopfzeile trotz Metadaten und Spalten-Offset', () => {
    const csv = `Export vom 01.01.2026
;;;;Buchungsdatum;Umsatztyp;Betrag (€)
;;;;01.02.2026;Ausgang;-5,00
`
    const { headers, records } = parseDelimitedCsv(csv)
    expect(headers[0]).toBe('Buchungsdatum')
    expect(records).toHaveLength(1)
    expect(records[0]['Buchungsdatum']).toBe('01.02.2026')
    expect(records[0]['Betrag (€)']).toBe('-5,00')
  })
})
