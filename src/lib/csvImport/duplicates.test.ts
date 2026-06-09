import { describe, expect, it } from 'vitest'
import { isDuplicateTransaction } from './duplicates'

describe('isDuplicateTransaction', () => {
  const existing = [
    {
      date: new Date(2026, 2, 15, 12, 0, 0),
      amount: -12.99,
      merchantId: 'm1',
      merchant: 'Netflix',
    },
  ]

  it('erkennt Duplikat nach Datum, Betrag und Händler-ID', () => {
    expect(
      isDuplicateTransaction(
        {
          date: new Date(2026, 2, 15, 8, 0, 0),
          amount: -12.99,
          merchantId: 'm1',
          merchantName: 'Netflix',
        },
        existing
      )
    ).toBe(true)
  })

  it('erkennt kein Duplikat bei abweichendem Betrag', () => {
    expect(
      isDuplicateTransaction(
        {
          date: new Date(2026, 2, 15),
          amount: -13.99,
          merchantId: 'm1',
          merchantName: 'Netflix',
        },
        existing
      )
    ).toBe(false)
  })
})
