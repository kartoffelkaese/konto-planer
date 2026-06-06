import { describe, it, expect } from 'vitest'
import { buildRecurringInstanceData } from './recurringInstances'
import type { Transaction } from '@prisma/client'

const template = {
  description: 'Miete',
  merchant: 'Vermieter',
  merchantId: 'm1',
  amount: -500,
  isTransfer: false,
  transferTargetAccountId: null,
} as Pick<
  Transaction,
  | 'description'
  | 'merchant'
  | 'merchantId'
  | 'amount'
  | 'isTransfer'
  | 'transferTargetAccountId'
>

describe('buildRecurringInstanceData', () => {
  it('übernimmt den aktuellen Vorlagenbetrag', () => {
    const data = buildRecurringInstanceData(
      template,
      new Date('2025-06-01'),
      'acc-1',
      'parent-1'
    )
    expect(data.amount).toBe(-500)
    expect(data.parentTransactionId).toBe('parent-1')
    expect(data.isRecurring).toBe(false)
  })

  it('nutzt den geänderten Vorlagenbetrag für neue Instanzen', () => {
    const updatedTemplate = { ...template, amount: -550 }
    const data = buildRecurringInstanceData(
      updatedTemplate,
      new Date('2025-07-01'),
      'acc-1',
      'parent-1'
    )
    expect(data.amount).toBe(-550)
  })
})
