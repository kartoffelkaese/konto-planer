import { describe, expect, it } from 'vitest'
import {
  findDuplicateTransaction,
  isDuplicateTransaction,
} from './duplicates'

describe('isDuplicateTransaction', () => {
  const existing = [
    {
      id: 'tx1',
      date: new Date(2026, 2, 15, 12, 0, 0),
      amount: -12.99,
      merchantId: 'm1',
      merchant: 'Netflix',
      isConfirmed: false,
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

describe('findDuplicateTransaction', () => {
  const existing = [
    {
      id: 'tx-open',
      date: new Date(2026, 5, 11, 12, 0, 0),
      amount: -4.99,
      merchantId: 'm1',
      merchant: 'Shop',
      isConfirmed: false,
    },
    {
      id: 'tx-booked',
      date: new Date(2026, 5, 10, 12, 0, 0),
      amount: -10,
      merchantId: 'm2',
      merchant: 'Other',
      isConfirmed: true,
    },
  ]

  it('liefert id und isConfirmed der ersten Übereinstimmung', () => {
    expect(
      findDuplicateTransaction(
        {
          date: new Date(2026, 5, 11),
          amount: -4.99,
          merchantId: 'm1',
          merchantName: 'Shop',
        },
        existing
      )
    ).toEqual({ id: 'tx-open', isConfirmed: false })
  })

  it('liefert null wenn kein Treffer', () => {
    expect(
      findDuplicateTransaction(
        {
          date: new Date(2026, 5, 11),
          amount: -99,
          merchantId: 'm1',
          merchantName: 'Shop',
        },
        existing
      )
    ).toBeNull()
  })
})
