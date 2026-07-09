import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('@/lib/api-auth', () => ({
  assertAccountWritable: vi.fn(),
}))

import {
  resolveTransferSenderName,
  isRecurringTemplate,
  shouldCreateTransferPair,
  type TransferDecisionFields,
} from './transfers'

describe('resolveTransferSenderName', () => {
  it('nutzt transferSenderName wenn gesetzt', () => {
    expect(
      resolveTransferSenderName({
        transferSenderName: 'Martin',
        name: 'Girokonto',
      })
    ).toBe('Martin')
  })

  it('fällt auf Kontoname zurück', () => {
    expect(
      resolveTransferSenderName({
        transferSenderName: null,
        name: 'Girokonto',
      })
    ).toBe('Girokonto')
  })
})

describe('isRecurringTemplate', () => {
  it('erkennt wiederkehrende Vorlage', () => {
    const tx = {
      isRecurring: true,
      parentTransactionId: null,
      isTransfer: false,
      transferTargetAccountId: null,
    } satisfies TransferDecisionFields
    expect(isRecurringTemplate(tx)).toBe(true)
  })
})

describe('shouldCreateTransferPair', () => {
  it('legt Pair für Einzelbuchung an', () => {
    const tx = {
      isTransfer: true,
      transferTargetAccountId: 'target-id',
      isRecurring: false,
      parentTransactionId: null,
    } satisfies TransferDecisionFields
    expect(shouldCreateTransferPair(tx)).toBe(true)
  })

  it('legt kein Pair für Vorlage an', () => {
    const tx = {
      isTransfer: true,
      transferTargetAccountId: 'target-id',
      isRecurring: true,
      parentTransactionId: null,
    } satisfies TransferDecisionFields
    expect(shouldCreateTransferPair(tx)).toBe(false)
  })
})
