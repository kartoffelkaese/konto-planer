import { describe, expect, it } from 'vitest'
import { parseCsv } from './index'

const SAMPLE_CSV = `Buchungsdatum;Status;Zahlungspflichtige*r;Zahlungsempfänger*in;Verwendungszweck;Umsatztyp;Betrag (€)
15.03.2026;Gebucht;Max Mustermann;Lidl.sagt.Danke/Nuernberg;Einkauf;Ausgang;-45,67
01.03.2026;Vorgemerkt;Arbeitgeber GmbH;Max Mustermann;Gehalt;Eingang;3200,00
`

describe('dkbExport CSV', () => {
  it('parst Zeilen mit Umsatztyp-Logik', () => {
    const { rows, formatId } = parseCsv(SAMPLE_CSV, {
      formatId: 'dkbExport',
    })
    expect(formatId).toBe('dkbExport')
    expect(rows).toHaveLength(2)

    expect(rows[0].merchantRaw).toBe('Lidl.sagt.Danke/Nuernberg')
    expect(rows[0].amount).toBe(-45.67)
    expect(rows[0].isConfirmed).toBe(true)
    expect(rows[0].description).toBe('Einkauf')

    expect(rows[1].merchantRaw).toBe('Arbeitgeber GmbH')
    expect(rows[1].amount).toBe(3200)
    expect(rows[1].isConfirmed).toBe(false)
  })

  it('parst CSV mit führenden Leerspalten (Überschriften ab Spalte 5)', () => {
    const paddedCsv = `Kontoumsätze Export
;;;;Buchungsdatum;Status;Zahlungspflichtige*r;Zahlungsempfänger*in;Verwendungszweck;Umsatztyp;Betrag (€)
;;;;15.03.2026;Gebucht;Max Mustermann;Unbekannt GmbH;Lidl Einkauf;Ausgang;-12,50
`
    const { rows, formatId } = parseCsv(paddedCsv, { formatId: 'dkbExport' })
    expect(formatId).toBe('dkbExport')
    expect(rows).toHaveLength(1)
    expect(rows[0].date).not.toBeNull()
    expect(rows[0].merchantRaw).toBe('Unbekannt GmbH')
    expect(rows[0].description).toBe('Lidl Einkauf')
    expect(rows[0].amount).toBe(-12.5)
  })

  it('nutzt bankId dkb als Format-Auswahl', () => {
    const { formatId } = parseCsv(SAMPLE_CSV, { bankId: 'dkb' })
    expect(formatId).toBe('dkbExport')
  })
})
