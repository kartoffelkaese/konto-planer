import { describe, it, expect } from 'vitest'
import { Prisma } from '@prisma/client'
import { buildRecurringInstanceData, recurringInstanceKey, type RecurringTemplate } from './recurringInstances'

const template = {
  description: 'Miete',
  merchant: 'Vermieter',
  merchantId: 'm1',
  categoryId: null,
  amount: new Prisma.Decimal(-500),
  isTransfer: false,
  transferTargetAccountId: null,
} satisfies RecurringTemplate

describe('buildRecurringInstanceData', () => {
  it('übernimmt den aktuellen Vorlagenbetrag', () => {
    const data = buildRecurringInstanceData(
      template,
      new Date('2025-06-01'),
      'acc-1',
      'parent-1'
    )
    expect(Number(data.amount)).toBe(-500)
    expect(data.parentTransactionId).toBe('parent-1')
    expect(data.isRecurring).toBe(false)
  })

  it('kopiert categoryId aus der Vorlage', () => {
    const data = buildRecurringInstanceData(
      { ...template, categoryId: 'cat-miete' },
      new Date('2025-06-01'),
      'acc-1',
      'parent-1'
    )
    expect(data.categoryId).toBe('cat-miete')
  })

  it('nutzt den geänderten Vorlagenbetrag für neue Instanzen', () => {
    const updatedTemplate = {
      ...template,
      amount: new Prisma.Decimal(-550),
    }
    const data = buildRecurringInstanceData(
      updatedTemplate,
      new Date('2025-07-01'),
      'acc-1',
      'parent-1'
    )
    expect(Number(data.amount)).toBe(-550)
  })
})

describe('recurringInstanceKey', () => {
  it('fasst alle Zeitpunkte eines Kalendertags zusammen', () => {
    const morning = new Date(2026, 9, 4, 0, 0, 0, 0)
    const evening = new Date(2026, 9, 4, 23, 59, 59, 999)
    expect(recurringInstanceKey('t1', morning)).toBe(recurringInstanceKey('t1', evening))
  })

  it('trennt Tage und Vorlagen', () => {
    const day = new Date(2026, 9, 4, 12)
    const nextDay = new Date(2026, 9, 5, 0, 0, 0, 0)
    expect(recurringInstanceKey('t1', day)).not.toBe(recurringInstanceKey('t1', nextDay))
    expect(recurringInstanceKey('t1', day)).not.toBe(recurringInstanceKey('t2', day))
  })
})
