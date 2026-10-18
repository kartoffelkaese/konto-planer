import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', async () => (await import('@/test/routeHarness')).prismaModule)
vi.mock('@/lib/auth', async () => (await import('@/test/routeHarness')).authModule)

import * as resetRoute from '@/app/api/accounts/reset/route'
import { jsonRequest, loginAs, prismaMock, resetRouteMocks, TEST_ACCOUNT } from '@/test/routeHarness'

const OTHER_ACCOUNT = { id: 'account-2', name: 'Haushalt' }

let counter = 0
const post = (body: unknown) =>
  resetRoute.POST(jsonRequest('POST', body, 'http://localhost/api/accounts/reset'))

/** Eigene Konten des Nutzers samt Zählwerten */
function ownAccounts(accounts: { id: string; name: string }[]) {
  prismaMock.accountMember.findMany.mockResolvedValue(
    accounts.map((account) => ({ account: { ...account, _count: { categories: 3, merchants: 5 } } }))
  )
}

beforeEach(() => {
  resetRouteMocks()
  // Eigener Nutzer je Test, damit sich das Rate-Limit nicht in die Quere kommt
  counter += 1
  loginAs({ user: { id: `reset-user-${counter}` } })
  ownAccounts([TEST_ACCOUNT, OTHER_ACCOUNT])
  prismaMock.transaction.groupBy.mockResolvedValue([])
  prismaMock.transferPair.findMany.mockResolvedValue([])
  prismaMock.transaction.count.mockResolvedValue(0)
  prismaMock.transaction.deleteMany.mockResolvedValue({ count: 0 })
  prismaMock.merchant.deleteMany.mockResolvedValue({ count: 0 })
  prismaMock.category.deleteMany.mockResolvedValue({ count: 0 })
})

describe('GET /api/accounts/reset', () => {
  it('liefert eigene Konten mit Zählwerten (Vorlagen getrennt von Buchungen)', async () => {
    prismaMock.transaction.groupBy
      .mockResolvedValueOnce([{ accountId: TEST_ACCOUNT.id, _count: 12 }])
      .mockResolvedValueOnce([{ accountId: TEST_ACCOUNT.id, _count: 2 }])
    const body = await (await resetRoute.GET()).json()
    expect(body.activeAccountId).toBe(TEST_ACCOUNT.id)
    expect(body.accounts[0]).toEqual({
      id: TEST_ACCOUNT.id,
      name: TEST_ACCOUNT.name,
      transactions: 10,
      recurring: 2,
      categories: 3,
      merchants: 5,
    })
  })
})

describe('POST /api/accounts/reset', () => {
  const current = { scope: 'current', confirmText: TEST_ACCOUNT.name }

  it('„Nur Buchungen“: Vorlagen wiederkehrender Zahlungen bleiben, Händler/Kategorien auch', async () => {
    prismaMock.transaction.deleteMany.mockResolvedValue({ count: 7 })
    const response = await post({ ...current, level: 'transactions' })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ accounts: 1, transactions: 7, recurring: 0, categories: 0, merchants: 0 })
    expect(prismaMock.transaction.deleteMany).toHaveBeenCalledWith({
      where: { accountId: { in: [TEST_ACCOUNT.id] }, NOT: { isRecurring: true, parentTransactionId: null } },
    })
    expect(prismaMock.merchant.deleteMany).not.toHaveBeenCalled()
    expect(prismaMock.category.deleteMany).not.toHaveBeenCalled()
  })

  it('„Buchungen und wiederkehrende“: alle Buchungen des Kontos', async () => {
    prismaMock.transaction.count.mockResolvedValue(2)
    prismaMock.transaction.deleteMany.mockResolvedValue({ count: 9 })
    const body = await (await post({ ...current, level: 'recurring' })).json()
    expect(body).toMatchObject({ transactions: 7, recurring: 2 })
    expect(prismaMock.transaction.deleteMany).toHaveBeenCalledWith({ where: { accountId: { in: [TEST_ACCOUNT.id] } } })
    expect(prismaMock.merchant.deleteMany).not.toHaveBeenCalled()
  })

  it('„Alles“: zusätzlich Händler und Kategorien', async () => {
    prismaMock.merchant.deleteMany.mockResolvedValue({ count: 5 })
    prismaMock.category.deleteMany.mockResolvedValue({ count: 3 })
    const body = await (await post({ ...current, level: 'everything' })).json()
    expect(body).toMatchObject({ categories: 3, merchants: 5 })
    expect(prismaMock.merchant.deleteMany).toHaveBeenCalledWith({ where: { accountId: { in: [TEST_ACCOUNT.id] } } })
    expect(prismaMock.category.deleteMany).toHaveBeenCalledWith({ where: { accountId: { in: [TEST_ACCOUNT.id] } } })
  })

  it('Umbuchung aus einem anderen Konto: Quellbuchung bleibt, nur die Verknüpfung wird gelöst', async () => {
    prismaMock.transferPair.findMany.mockResolvedValue([{ id: 'pair-1', sourceTransactionId: 'tx-in-b' }])
    await post({ ...current, level: 'transactions' })
    expect(prismaMock.transferPair.findMany.mock.calls[0][0].where.sourceTransaction).toEqual({
      accountId: { notIn: [TEST_ACCOUNT.id] },
    })
    expect(prismaMock.transferPair.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['pair-1'] } } })
    expect(prismaMock.transaction.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['tx-in-b'] } },
      data: { isTransfer: false, transferTargetAccountId: null, transferTargetMerchant: null },
    })
  })

  it('„Alle Konten“: nur eigene Konten, Bestätigung mit „ZURÜCKSETZEN“', async () => {
    expect((await post({ scope: 'all', level: 'transactions', confirmText: TEST_ACCOUNT.name })).status).toBe(400)
    const response = await post({ scope: 'all', level: 'recurring', confirmText: 'ZURÜCKSETZEN' })
    expect(response.status).toBe(200)
    expect((await response.json()).accounts).toBe(2)
    expect(prismaMock.accountMember.findMany.mock.calls[0][0].where).toMatchObject({ role: 'OWNER' })
    expect(prismaMock.transaction.deleteMany).toHaveBeenCalledWith({
      where: { accountId: { in: [TEST_ACCOUNT.id, OTHER_ACCOUNT.id] } },
    })
  })

  it('Mitglied ohne Inhaberrolle: 403, nichts gelöscht', async () => {
    loginAs({ role: 'MEMBER', user: { id: `reset-member-${counter}` } })
    expect((await post({ ...current, level: 'transactions' })).status).toBe(403)
    expect(prismaMock.transaction.deleteMany).not.toHaveBeenCalled()
  })

  it('falscher Bestätigungstext oder ungültige Stufe: 400, nichts gelöscht', async () => {
    expect((await post({ ...current, level: 'transactions', confirmText: 'Anderes Konto' })).status).toBe(400)
    expect((await post({ ...current, level: 'alles' })).status).toBe(400)
    expect((await post({ scope: 'fremd', level: 'transactions', confirmText: TEST_ACCOUNT.name })).status).toBe(400)
    expect(prismaMock.transaction.deleteMany).not.toHaveBeenCalled()
  })

  it('Rate-Limit: höchstens 5 Versuche pro Stunde', async () => {
    for (let i = 0; i < 5; i++) {
      expect((await post({ ...current, level: 'transactions' })).status).toBe(200)
    }
    expect((await post({ ...current, level: 'transactions' })).status).toBe(429)
  })
})
