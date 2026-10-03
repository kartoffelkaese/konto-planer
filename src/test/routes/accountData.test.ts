import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', async () => (await import('@/test/routeHarness')).prismaModule)
vi.mock('@/lib/auth', async () => (await import('@/test/routeHarness')).authModule)

import * as transactionRoute from '@/app/api/transactions/[id]/route'
import * as categoryRoute from '@/app/api/categories/[id]/route'
import * as merchantRoute from '@/app/api/merchants/[id]/route'
import { jsonRequest, loginAs, prismaMock, resetRouteMocks, routeParams, TEST_ACCOUNT } from '@/test/routeHarness'
import { NextRequest } from 'next/server'

beforeEach(() => {
  resetRouteMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

const req = (method: string, body?: unknown) =>
  new NextRequest(jsonRequest(method, body, 'http://localhost/api/x'))
const params = routeParams({ id: 'fremde-id' })

/** Jede Abfrage nach einer ID muss zusätzlich an das aktive Konto gebunden sein */
const scopedToAccount = expect.objectContaining({
  where: expect.objectContaining({ id: 'fremde-id', accountId: TEST_ACCOUNT.id }),
})

describe('Buchungen per ID', () => {
  it('ohne Anmeldung: 401', async () => {
    expect((await transactionRoute.GET(req('GET'), params)).status).toBe(401)
  })

  it('fremde Buchung: 404, gesucht wird nur im aktiven Konto', async () => {
    loginAs()
    prismaMock.transaction.findFirst.mockResolvedValue(null)
    expect((await transactionRoute.GET(req('GET'), params)).status).toBe(404)
    expect(prismaMock.transaction.findFirst).toHaveBeenCalledWith(scopedToAccount)
  })

  it('Nur-Lesen-Mitglied darf nicht ändern oder löschen (403)', async () => {
    loginAs({ role: 'READ_ONLY' })
    expect((await transactionRoute.PATCH(req('PATCH', { amount: 1 }), params)).status).toBe(403)
    expect((await transactionRoute.DELETE(req('DELETE'), params)).status).toBe(403)
    expect(prismaMock.transaction.update).not.toHaveBeenCalled()
    expect(prismaMock.transaction.delete).not.toHaveBeenCalled()
  })

  it('fremde Buchung löschen: 404, nichts gelöscht', async () => {
    loginAs()
    prismaMock.transaction.findFirst.mockResolvedValue(null)
    expect((await transactionRoute.DELETE(req('DELETE'), params)).status).toBe(404)
    expect(prismaMock.transaction.delete).not.toHaveBeenCalled()
  })

  it('eigene Buchung löschen: 204', async () => {
    loginAs()
    prismaMock.transaction.findFirst.mockResolvedValue({ id: 'fremde-id', accountId: TEST_ACCOUNT.id })
    prismaMock.transferPair.findFirst.mockResolvedValue(null)
    expect((await transactionRoute.DELETE(req('DELETE'), params)).status).toBe(204)
    expect(prismaMock.transaction.delete).toHaveBeenCalledWith({ where: { id: 'fremde-id' } })
  })
})

describe('Kategorien per ID', () => {
  it('fremde Kategorie: 404, gesucht wird nur im aktiven Konto', async () => {
    loginAs()
    prismaMock.category.findFirst.mockResolvedValue(null)
    expect((await categoryRoute.GET(req('GET'), params)).status).toBe(404)
    expect(prismaMock.category.findFirst).toHaveBeenCalledWith(scopedToAccount)
  })

  it('Nur-Lesen-Mitglied darf nicht löschen (403)', async () => {
    loginAs({ role: 'READ_ONLY' })
    expect((await categoryRoute.DELETE(req('DELETE'), params)).status).toBe(403)
    expect(prismaMock.category.delete).not.toHaveBeenCalled()
  })

  it('Löschen ist an das aktive Konto gebunden', async () => {
    loginAs()
    prismaMock.category.findFirst.mockResolvedValue({ id: 'fremde-id', _count: { merchants: 0 } })
    expect((await categoryRoute.DELETE(req('DELETE'), params)).status).toBe(200)
    expect(prismaMock.category.delete).toHaveBeenCalledWith(scopedToAccount)
  })
})

describe('Händler per ID', () => {
  it('fremder Händler: 404, gesucht wird nur im aktiven Konto', async () => {
    loginAs()
    prismaMock.merchant.findFirst.mockResolvedValue(null)
    expect((await merchantRoute.GET(req('GET'), params)).status).toBe(404)
    expect(prismaMock.merchant.findFirst).toHaveBeenCalledWith(scopedToAccount)
  })

  it('Nur-Lesen-Mitglied darf nicht löschen (403)', async () => {
    loginAs({ role: 'READ_ONLY' })
    expect((await merchantRoute.DELETE(req('DELETE'), params)).status).toBe(403)
    expect(prismaMock.merchant.delete).not.toHaveBeenCalled()
  })

  it('Löschen ist an das aktive Konto gebunden', async () => {
    loginAs()
    expect((await merchantRoute.DELETE(req('DELETE'), params)).status).toBe(204)
    expect(prismaMock.merchant.delete).toHaveBeenCalledWith(scopedToAccount)
  })
})
