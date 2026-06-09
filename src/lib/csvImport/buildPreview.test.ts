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
})
