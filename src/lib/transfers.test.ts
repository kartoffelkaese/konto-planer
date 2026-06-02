import { describe, expect, it } from 'vitest'
import {
  resolveTransferSenderName,
  isRecurringTemplate,
  shouldCreateTransferPair,
} from './transfers'
import type { Transaction } from '@prisma/client'

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
    } as Transaction
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
    } as Transaction
    expect(shouldCreateTransferPair(tx)).toBe(true)
  })

  it('legt kein Pair für Vorlage an', () => {
    const tx = {
      isTransfer: true,
      transferTargetAccountId: 'target-id',
      isRecurring: true,
      parentTransactionId: null,
    } as Transaction
    expect(shouldCreateTransferPair(tx)).toBe(false)
  })
})
