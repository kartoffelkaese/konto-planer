import { describe, expect, it } from 'vitest'
import type { CsvImportPreviewRow } from '@/lib/api'
import {
  buildCommitRows,
  rowCanConfirm,
  rowIsValid,
  rowsToConfirm,
  rowsToImport,
  toEditableRows,
} from './importRows'

function previewRow(overrides: Partial<CsvImportPreviewRow> = {}): CsvImportPreviewRow {
  return {
    rowIndex: 1,
    date: '2026-10-01',
    amount: -12.5,
    description: 'Einkauf',
    merchantRaw: 'REWE SAGT DANKE',
    merchantId: 'm1',
    merchantName: 'Rewe',
    matchConfidence: 'exact',
    categoryId: 'c1',
    isConfirmed: true,
    isDuplicate: false,
    duplicateTransactionId: null,
    canConfirmDuplicate: false,
    isRecurringMatch: false,
    recurringMatchKind: 'none',
    recurringTemplateId: null,
    recurringInstanceId: null,
    canConfirmRecurring: false,
    errors: [],
    suggestedIncluded: true,
    suggestedConfirm: false,
    suggestedConfirmRecurring: false,
    ...overrides,
  }
}

describe('toEditableRows', () => {
  it('übernimmt Vorschläge und schlägt bei unbekanntem Händler „neu anlegen“ vor', () => {
    const [known, unknown] = toEditableRows([
      previewRow(),
      previewRow({ rowIndex: 2, merchantId: null, merchantName: null }),
    ])
    expect(known.included).toBe(true)
    expect(known.createNewMerchant).toBe(false)
    expect(unknown.createNewMerchant).toBe(true)
    expect(unknown.merchantName).toBe('REWE SAGT DANKE')
  })
})

describe('rowIsValid / rowCanConfirm', () => {
  it('verlangt Datum, Betrag und einen Händler', () => {
    const [row] = toEditableRows([previewRow()])
    expect(rowIsValid(row)).toBe(true)
    expect(rowIsValid({ ...row, date: null })).toBe(false)
    expect(rowIsValid({ ...row, merchantId: null, createNewMerchant: false })).toBe(false)
    expect(rowIsValid({ ...row, errors: ['Ungültig'] })).toBe(false)
  })

  it('erkennt bestätigbare Duplikate und wiederkehrende Buchungen', () => {
    const [row] = toEditableRows([previewRow()])
    expect(rowCanConfirm(row)).toBe(false)
    expect(
      rowCanConfirm({ ...row, canConfirmDuplicate: true, duplicateTransactionId: 't1' })
    ).toBe(true)
    expect(
      rowCanConfirm({ ...row, canConfirmRecurring: true, recurringMatchKind: 'alreadyBooked' })
    ).toBe(false)
  })
})

describe('buildCommitRows', () => {
  it('trennt Import und Bestätigung und baut die Zeilen für die API', () => {
    const rows = toEditableRows([
      previewRow(),
      previewRow({
        rowIndex: 2,
        isDuplicate: true,
        canConfirmDuplicate: true,
        duplicateTransactionId: 't1',
        suggestedIncluded: false,
        suggestedConfirm: true,
      }),
      previewRow({
        rowIndex: 3,
        isRecurringMatch: true,
        canConfirmRecurring: true,
        recurringMatchKind: 'createAndConfirm',
        recurringTemplateId: 'r1',
        suggestedIncluded: false,
        suggestedConfirmRecurring: true,
      }),
      previewRow({ rowIndex: 4, merchantId: null, merchantName: null, categoryId: null }),
    ])

    const toImport = rowsToImport(rows)
    const toConfirm = rowsToConfirm(rows)
    expect(toImport.map((r) => r.rowIndex)).toEqual([1, 4])
    expect(toConfirm.map((r) => r.rowIndex)).toEqual([2, 3])

    expect(buildCommitRows(toConfirm, toImport)).toEqual([
      { rowIndex: 2, confirmExistingId: 't1' },
      { rowIndex: 3, confirmRecurringTemplateId: 'r1', date: '2026-10-01', amount: -12.5 },
      {
        rowIndex: 1,
        date: '2026-10-01',
        amount: -12.5,
        description: 'Einkauf',
        merchantId: 'm1',
        merchant: undefined,
        createNewMerchant: false,
        categoryId: 'c1',
        isConfirmed: true,
      },
      {
        rowIndex: 4,
        date: '2026-10-01',
        amount: -12.5,
        description: 'Einkauf',
        merchantId: null,
        merchant: 'REWE SAGT DANKE',
        createNewMerchant: true,
        categoryId: null,
        isConfirmed: true,
      },
    ])
  })
})
