import { describe, expect, it } from 'vitest'
import { parseCsv } from './index'

const SAMPLE_ING_CSV = `Datum;Wertstellung;Empfänger/Auftraggeber;Buchungstext;Verwendungszweck;Saldo;Währung;Betrag
15.03.2026;15.03.2026;REWE Markt;Kartenzahlung;EC-Karte;1234,56;EUR;-45,99
01.03.2026;01.03.2026;Arbeitgeber GmbH;Gehalt;Monatsgehalt;5000,00;EUR;3200,00
`

describe('ingExport CSV', () => {
  it('parst ING-Zeilen mit vorzeichenbehaftetem Betrag', () => {
    const { rows, formatId, formatLabel } = parseCsv(SAMPLE_ING_CSV, {
      formatId: 'ingExport',
    })
    expect(formatId).toBe('ingExport')
    expect(formatLabel).toBe('ING Kontoumsätze')
    expect(rows).toHaveLength(2)

    expect(rows[0].merchantRaw).toBe('REWE Markt')
    expect(rows[0].amount).toBe(-45.99)
    expect(rows[0].isConfirmed).toBe(true)
    expect(rows[0].description).toBe('EC-Karte')

    expect(rows[1].merchantRaw).toBe('Arbeitgeber GmbH')
    expect(rows[1].amount).toBe(3200)
  })

  it('nutzt bankId ing als Format-Auswahl', () => {
    const { formatId } = parseCsv(SAMPLE_ING_CSV, { bankId: 'ing' })
    expect(formatId).toBe('ingExport')
  })
})
