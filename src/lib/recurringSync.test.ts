import { describe, it, expect, vi, beforeEach } from 'vitest'

const { findManyMock, updateManyMock, syncTransferPairMock } = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  updateManyMock: vi.fn(),
  syncTransferPairMock: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    transaction: {
      findMany: findManyMock,
      updateMany: updateManyMock,
    },
  },
}))

vi.mock('@/lib/transfers', () => ({
  syncTransferPair: syncTransferPairMock,
}))

import { syncUnconfirmedRecurringInstanceAmounts } from './recurringSync'

describe('syncUnconfirmedRecurringInstanceAmounts', () => {
  beforeEach(() => {
    findManyMock.mockReset()
    updateManyMock.mockReset()
    syncTransferPairMock.mockReset()
  })

  it('aktualisiert unbestätigte Instanzen auf den neuen Vorlagenbetrag', async () => {
    findManyMock.mockResolvedValue([
      { id: 'inst-1', isTransfer: false },
      { id: 'inst-2', isTransfer: false },
    ])

    await syncUnconfirmedRecurringInstanceAmounts('template-1', -75)

    expect(updateManyMock).toHaveBeenCalledWith({
      where: { id: { in: ['inst-1', 'inst-2'] } },
      data: { amount: -75 },
    })
    expect(syncTransferPairMock).not.toHaveBeenCalled()
  })

  it('synchronisiert Umbuchungs-Gegenbuchungen bei Transfer-Instanzen', async () => {
    findManyMock.mockResolvedValue([{ id: 'inst-t', isTransfer: true }])

    await syncUnconfirmedRecurringInstanceAmounts('template-1', -200)

    expect(syncTransferPairMock).toHaveBeenCalledWith('inst-t', { amount: -200 })
  })

  it('lässt bestätigte Instanzen unberührt (werden nicht abgefragt)', async () => {
    findManyMock.mockResolvedValue([])

    await syncUnconfirmedRecurringInstanceAmounts('template-1', -100)

    expect(updateManyMock).not.toHaveBeenCalled()
  })
})
