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

  it('sortiert Zeilen nach Datum aufsteigend', () => {
    const parsed: ParsedCsvRow[] = [
      {
        rowIndex: 3,
        date: new Date(2026, 5, 20, 12, 0, 0),
        amount: -5,
        description: 'Spät',
        merchantRaw: 'Spät',
        isConfirmed: true,
        umsatztyp: 'ausgang',
        errors: [],
      },
      {
        rowIndex: 1,
        date: new Date(2026, 5, 5, 12, 0, 0),
        amount: -1,
        description: 'Früh',
        merchantRaw: 'Früh',
        isConfirmed: true,
        umsatztyp: 'ausgang',
        errors: [],
      },
    ]

    const preview = buildImportPreviewRows(parsed, merchants, [])
    expect(preview.map((r) => r.date)).toEqual(['2026-06-05', '2026-06-20'])
  })

  it('erkennt wiederkehrende Zahlung und blockiert Import', () => {
    const parsed: ParsedCsvRow[] = [
      {
        rowIndex: 1,
        date: new Date(2026, 2, 14, 12, 0, 0),
        amount: -49.99,
        description: 'Streaming',
        merchantRaw: 'Streaming',
        isConfirmed: true,
        umsatztyp: 'ausgang',
        errors: [],
      },
    ]

    const preview = buildImportPreviewRows(parsed, merchants, [], {
      enableRecurringMatch: true,
      salaryDay: 25,
      recurringTemplates: [
        {
          id: 'tmpl-1',
          date: new Date(2026, 0, 15, 12, 0, 0),
          amount: -49.99,
          merchantId: 'm-stream',
          merchant: 'Streaming',
          recurringInterval: 'monthly',
        },
      ],
      recurringInstances: [],
    })

    expect(preview[0].isRecurringMatch).toBe(true)
    expect(preview[0].recurringMatchKind).toBe('createAndConfirm')
    expect(preview[0].canConfirmRecurring).toBe(true)
    expect(preview[0].suggestedIncluded).toBe(false)
    expect(preview[0].isDuplicate).toBe(false)
  })
})
