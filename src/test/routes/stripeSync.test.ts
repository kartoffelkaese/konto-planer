import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', async () => (await import('@/test/routeHarness')).prismaModule)
vi.mock('@/lib/auth', async () => (await import('@/test/routeHarness')).authModule)
const syncCustomer = vi.hoisted(() => vi.fn())
vi.mock('@/lib/billing', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/billing')>()),
  syncCustomer,
}))

import { NextRequest } from 'next/server'
import * as adminSyncRoute from '@/app/api/admin/users/[id]/sync/route'
import * as cronRoute from '@/app/api/cron/stripe-sync/route'
import { isPublicApiPath } from '@/lib/public-api'
import { jsonRequest, loginAs, prismaMock, resetRouteMocks, routeParams, TEST_USER } from '@/test/routeHarness'

beforeEach(() => {
  resetRouteMocks()
  syncCustomer.mockReset()
  syncCustomer.mockResolvedValue('updated')
  vi.stubEnv('PLANS_ENABLED', 'true')
  for (const key of ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PRICE_MONTHLY', 'STRIPE_PRICE_YEARLY']) {
    vi.stubEnv(key, 'x')
  }
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => vi.unstubAllEnvs())

describe('Abgleich in der Verwaltung', () => {
  const sync = () =>
    adminSyncRoute.POST(new NextRequest(jsonRequest('POST', {}, 'http://localhost/api/admin/users/user-2/sync')), routeParams({ id: 'user-2' }))

  it('nur für Admins', async () => {
    loginAs()
    expect((await sync()).status).toBe(404)
    expect(syncCustomer).not.toHaveBeenCalled()
  })

  it('gleicht den Stripe-Kunden des Nutzers ab', async () => {
    loginAs({ user: { isAdmin: true } })
    prismaMock.user.findUnique
      .mockResolvedValueOnce({ ...TEST_USER, isAdmin: true })
      .mockResolvedValueOnce({ stripeCustomerId: 'cus_2' })
    expect((await sync()).status).toBe(200)
    expect(syncCustomer).toHaveBeenCalledWith('cus_2')
  })

  it('ohne Stripe-Kunden: 400', async () => {
    loginAs({ user: { isAdmin: true } })
    prismaMock.user.findUnique
      .mockResolvedValueOnce({ ...TEST_USER, isAdmin: true })
      .mockResolvedValueOnce({ stripeCustomerId: null })
    expect((await sync()).status).toBe(400)
  })
})

describe('Täglicher Abgleich', () => {
  const run = (authorization?: string) =>
    cronRoute.POST(
      new Request('http://localhost/api/cron/stripe-sync', {
        method: 'POST',
        headers: authorization ? { authorization } : {},
      })
    )

  it('ist ohne Sitzung erreichbar, aber nur mit dem Geheimnis', async () => {
    expect(isPublicApiPath('/api/cron/stripe-sync')).toBe(true)
    vi.stubEnv('CRON_SECRET', 'geheim-und-lang')
    expect((await run()).status).toBe(401)
    expect((await run('Bearer falsch')).status).toBe(401)
    expect(prismaMock.user.findMany).not.toHaveBeenCalled()
  })

  it('ohne CRON_SECRET gibt es die Route nicht', async () => {
    expect((await run('Bearer irgendwas')).status).toBe(404)
  })

  it('gleicht alle betroffenen Kunden ab und zählt Fehler, ohne abzubrechen', async () => {
    vi.stubEnv('CRON_SECRET', 'geheim-und-lang')
    prismaMock.user.findMany.mockResolvedValue([
      { stripeCustomerId: 'cus_1' },
      { stripeCustomerId: 'cus_2' },
      { stripeCustomerId: 'cus_3' },
    ])
    syncCustomer.mockResolvedValueOnce('updated').mockRejectedValueOnce(new Error('Stripe')).mockResolvedValueOnce('updated')

    const response = await run('Bearer geheim-und-lang')
    expect(await response.json()).toEqual({ synced: 2, failed: 1 })
    expect(syncCustomer.mock.calls.map((c) => c[0])).toEqual(['cus_1', 'cus_2', 'cus_3'])
  })

  it('nimmt auch Kunden ohne bekannten Abo-Stand mit (verpasstes erstes Ereignis)', async () => {
    vi.stubEnv('CRON_SECRET', 'geheim-und-lang')
    prismaMock.user.findMany.mockResolvedValue([])
    await run('Bearer geheim-und-lang')
    const where = prismaMock.user.findMany.mock.calls[0][0].where
    expect(where.stripeCustomerId).toEqual({ not: null })
    expect(where.OR).toContainEqual({ stripeSubscriptionStatus: null })
  })
})
