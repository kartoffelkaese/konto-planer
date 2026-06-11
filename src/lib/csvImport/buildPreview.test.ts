import { describe, expect, it } from 'vitest'
import { buildImportPreviewRows } from './buildPreview'
import type { ParsedCsvRow } from './types'

const merchants = [
  { id: '1', name: 'Lidl', categoryIds: ['c1'] },
  { id: '2', name: 'REWE', categoryIds: [] },
]

describe('buildImportPreviewRows', () => {
  it('findet Händler im Verwendungszweck wenn Zahlungspartner unbekannt', () => {
    const parsed: ParsedCsvRow[] = [
      {
        rowIndex: 1,
        date: new Date(2026, 2, 15, 12, 0, 0),
        amount: -12.5,
        description: 'Lidl.sagt.Danke/Nuernberg',
        merchantRaw: 'Lastschrift Kartenzahlung',
        isConfirmed: true,
        umsatztyp: 'ausgang',
        errors: [],
      },
    ]

    const preview = buildImportPreviewRows(parsed, merchants, [])
    expect(preview[0].merchantId).toBe('1')
    expect(preview[0].merchantName).toBe('Lidl')
    expect(preview[0].matchConfidence).toBe('contains')
  })

  it('bietet Bestätigung bei Duplikat mit offener DB-Buchung und CSV gebucht', () => {
    const parsed: ParsedCsvRow[] = [
      {
        rowIndex: 1,
        date: new Date(2026, 5, 11, 12, 0, 0),
        amount: -4.99,
        description: 'Lidl',
        merchantRaw: 'Lidl',
        isConfirmed: true,
        umsatztyp: 'ausgang',
        errors: [],
      },
    ]

    const existing = [
      {
        id: 'tx-open',
        date: new Date(2026, 5, 11, 12, 0, 0),
        amount: -4.99,
        merchantId: '1',
        merchant: 'Lidl',
        isConfirmed: false,
      },
    ]

    const preview = buildImportPreviewRows(parsed, merchants, existing)
    expect(preview[0].isDuplicate).toBe(true)
    expect(preview[0].duplicateTransactionId).toBe('tx-open')
    expect(preview[0].canConfirmDuplicate).toBe(true)
    expect(preview[0].suggestedConfirm).toBe(true)
    expect(preview[0].suggestedIncluded).toBe(false)
  })

  it('kein Bestätigungsangebot wenn DB-Buchung bereits gebucht', () => {
    const parsed: ParsedCsvRow[] = [
      {
        rowIndex: 1,
        date: new Date(2026, 5, 10, 12, 0, 0),
        amount: -10,
        description: 'REWE',
        merchantRaw: 'REWE',
        isConfirmed: true,
        umsatztyp: 'ausgang',
        errors: [],
      },
    ]

    const existing = [
      {
        id: 'tx-booked',
        date: new Date(2026, 5, 10, 12, 0, 0),
        amount: -10,
        merchantId: '2',
        merchant: 'REWE',
        isConfirmed: true,
      },
    ]

    const preview = buildImportPreviewRows(parsed, merchants, existing)
    expect(preview[0].canConfirmDuplicate).toBe(false)
    expect(preview[0].suggestedConfirm).toBe(false)
  })

  it('kein Bestätigungsangebot wenn CSV Vorgemerkt und DB offen', () => {
    const parsed: ParsedCsvRow[] = [
      {
        rowIndex: 1,
        date: new Date(2026, 5, 11, 12, 0, 0),
        amount: -4.99,
        description: 'Lidl',
        merchantRaw: 'Lidl',
        isConfirmed: false,
        umsatztyp: 'ausgang',
        errors: [],
      },
    ]

    const existing = [
      {
        id: 'tx-open',
        date: new Date(2026, 5, 11, 12, 0, 0),
        amount: -4.99,
        merchantId: '1',
        merchant: 'Lidl',
        isConfirmed: false,
      },
    ]

    const preview = buildImportPreviewRows(parsed, merchants, existing)
    expect(preview[0].isDuplicate).toBe(true)
    expect(preview[0].canConfirmDuplicate).toBe(false)
    expect(preview[0].suggestedConfirm).toBe(false)
  })
})
