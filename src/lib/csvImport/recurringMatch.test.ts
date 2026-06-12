import { describe, expect, it } from 'vitest'
import { findRecurringCsvMatch } from './recurringMatch'

const salaryDay = 25

const template = {
  id: 'tmpl-1',
  date: new Date(2026, 0, 15, 12, 0, 0),
  amount: -49.99,
  merchantId: 'm1',
  merchant: 'Streaming',
  recurringInterval: 'monthly',
}

describe('findRecurringCsvMatch', () => {
  it('createAndConfirm wenn Vorlage passt aber keine Instanz im Gehaltsmonat', () => {
    expect(
      findRecurringCsvMatch(
        {
          date: new Date(2026, 2, 14, 12, 0, 0),
          amount: -49.99,
          merchantId: 'm1',
          merchantName: 'Streaming',
          csvIsConfirmed: true,
        },
        [template],
        [],
        salaryDay
      )
    ).toEqual({
      kind: 'createAndConfirm',
      templateId: 'tmpl-1',
      instanceId: null,
    })
  })

  it('confirmExisting bei offener Instanz im Gehaltsmonat', () => {
    expect(
      findRecurringCsvMatch(
        {
          date: new Date(2026, 2, 14, 12, 0, 0),
          amount: -49.99,
          merchantId: 'm1',
          merchantName: 'Streaming',
          csvIsConfirmed: true,
        },
        [template],
        [
          {
            id: 'inst-1',
            date: new Date(2026, 2, 15, 12, 0, 0),
            amount: -49.99,
            merchantId: 'm1',
            merchant: 'Streaming',
            isConfirmed: false,
            parentTransactionId: 'tmpl-1',
          },
        ],
        salaryDay
      )
    ).toEqual({
      kind: 'confirmExisting',
      templateId: 'tmpl-1',
      instanceId: 'inst-1',
    })
  })

  it('alreadyBooked wenn Instanz bereits gebucht', () => {
    expect(
      findRecurringCsvMatch(
        {
          date: new Date(2026, 2, 14, 12, 0, 0),
          amount: -49.99,
          merchantId: 'm1',
          merchantName: 'Streaming',
          csvIsConfirmed: true,
        },
        [template],
        [
          {
            id: 'inst-1',
            date: new Date(2026, 2, 15, 12, 0, 0),
            amount: -49.99,
            merchantId: 'm1',
            merchant: 'Streaming',
            isConfirmed: true,
            parentTransactionId: 'tmpl-1',
          },
        ],
        salaryDay
      )
    ).toEqual({
      kind: 'alreadyBooked',
      templateId: 'tmpl-1',
      instanceId: 'inst-1',
    })
  })

  it('none wenn CSV nicht gebucht', () => {
    expect(
      findRecurringCsvMatch(
        {
          date: new Date(2026, 2, 14, 12, 0, 0),
          amount: -49.99,
          merchantId: 'm1',
          merchantName: 'Streaming',
          csvIsConfirmed: false,
        },
        [template],
        [],
        salaryDay
      )
    ).toEqual({ kind: 'none', templateId: null, instanceId: null })
  })

  it('none bei abweichendem Betrag', () => {
    expect(
      findRecurringCsvMatch(
        {
          date: new Date(2026, 2, 14, 12, 0, 0),
          amount: -99,
          merchantId: 'm1',
          merchantName: 'Streaming',
          csvIsConfirmed: true,
        },
        [template],
        [],
        salaryDay
      )
    ).toEqual({ kind: 'none', templateId: null, instanceId: null })
  })
})
