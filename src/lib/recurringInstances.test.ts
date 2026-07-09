import { describe, it, expect } from 'vitest'
import { Prisma } from '@prisma/client'
import { buildRecurringInstanceData, type RecurringTemplate } from './recurringInstances'

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
