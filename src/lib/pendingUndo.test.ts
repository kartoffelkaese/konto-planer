import { describe, expect, it } from 'vitest'
import { buildPendingUndoEntry, parsePendingUndoEntry } from '@/lib/pendingUndo'

const created = {
  id: 't1',
  accountId: 'a1',
  merchant: 'Miete',
  description: null,
  amount: '-750.00',
  date: '2026-10-01T00:00:00.000Z',
  categoryId: 'c1',
  isConfirmed: false,
}

describe('buildPendingUndoEntry', () => {
  it('liefert null, wenn nichts erstellt wurde', () => {
    expect(buildPendingUndoEntry([])).toBeNull()
  })

  it('übernimmt nur die Vergleichsfelder und wandelt den Betrag in eine Zahl', () => {
    expect(buildPendingUndoEntry([created])).toEqual({
      accountId: 'a1',
      items: [
        {
          id: 't1',
          merchant: 'Miete',
          description: null,
          amount: -750,
          date: '2026-10-01T00:00:00.000Z',
          categoryId: 'c1',
        },
      ],
    })
  })
})

describe('parsePendingUndoEntry', () => {
  it('liest einen gespeicherten Eintrag zurück', () => {
    const entry = buildPendingUndoEntry([created])
    expect(parsePendingUndoEntry(JSON.stringify(entry))).toEqual(entry)
  })

  it('verwirft leere, kaputte oder unvollständige Werte', () => {
    expect(parsePendingUndoEntry(null)).toBeNull()
    expect(parsePendingUndoEntry('{kaputt')).toBeNull()
    expect(parsePendingUndoEntry('"text"')).toBeNull()
    expect(parsePendingUndoEntry(JSON.stringify({ accountId: 'a1', items: [] }))).toBeNull()
    expect(parsePendingUndoEntry(JSON.stringify({ items: [{ id: 't1' }] }))).toBeNull()
  })
})
