import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', async () => (await import('@/test/routeHarness')).prismaModule)
vi.mock('@/lib/auth', async () => (await import('@/test/routeHarness')).authModule)

import { NextRequest } from 'next/server'
import * as usersRoute from '@/app/api/admin/users/route'
import * as planRoute from '@/app/api/admin/users/[id]/plan/route'
import * as userRoute from '@/app/api/admin/users/[id]/route'
import { jsonRequest, loginAs, prismaMock, resetRouteMocks, routeParams, TEST_USER } from '@/test/routeHarness'

beforeEach(() => {
  resetRouteMocks()
  vi.stubEnv('PLANS_ENABLED', 'true')
})

afterEach(() => vi.unstubAllEnvs())

const req = (method: string, body?: unknown, url = 'http://localhost/api/admin/users') =>
  new NextRequest(jsonRequest(method, body, url))
const params = routeParams({ id: 'user-2' })

describe('Zugang zur Verwaltung', () => {
  it('ohne Admin-Recht: 404, ohne Abfrage', async () => {
    loginAs()
    expect((await usersRoute.GET(req('GET'))).status).toBe(404)
    expect((await planRoute.GET(req('GET'), params)).status).toBe(404)
    expect((await planRoute.PATCH(req('PATCH', { plan: 'FULL' }), params)).status).toBe(404)
    expect(prismaMock.user.findMany).not.toHaveBeenCalled()
    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })

  it('ohne aktive Level: auch für Admins 404', async () => {
    vi.stubEnv('PLANS_ENABLED', 'false')
    loginAs({ user: { isAdmin: true } })
    expect((await usersRoute.GET(req('GET'))).status).toBe(404)
  })

  it('ohne Sitzung: 401', async () => {
    expect((await usersRoute.GET(req('GET'))).status).toBe(401)
  })
})

describe('Nutzerliste', () => {
  it('liefert Stammdaten, geltendes Level und Zählwerte', async () => {
    loginAs({ user: { isAdmin: true } })
    prismaMock.user.count.mockResolvedValue(1)
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: 'user-2',
        email: 'anna@beispiel.de',
        emailVerified: new Date('2026-09-01'),
        createdAt: new Date('2026-09-01'),
        lastLoginAt: new Date('2026-10-05T12:00:00Z'),
        plan: 'FULL',
        planSource: 'TRIAL',
        planExpiresAt: new Date('2020-01-01'),
        isAdmin: false,
        _count: { memberships: 2, splitListsCreated: 1 },
      },
    ])

    const response = await usersRoute.GET(req('GET', undefined, 'http://localhost/api/admin/users?q=anna&page=2'))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.users[0]).toMatchObject({
      email: 'anna@beispiel.de',
      emailVerified: true,
      lastLoginAt: '2026-10-05T12:00:00.000Z',
      plan: 'FULL',
      effectivePlan: 'BASIC',
      ownedAccounts: 2,
      splitLists: 1,
    })
    expect(body.total).toBe(1)

    const query = prismaMock.user.findMany.mock.calls[0][0]
    expect(query.where).toEqual({ email: { contains: 'anna' } })
    expect(query.skip).toBe(25)
    expect(query.select).not.toHaveProperty('passwordHash')
  })
})

describe('Level ändern', () => {
  beforeEach(() => {
    loginAs({ user: { isAdmin: true } })
  })

  it('lehnt unbekannte Level und vergangene Ablaufdaten ab', async () => {
    expect((await planRoute.PATCH(req('PATCH', { plan: 'GOLD' }), params)).status).toBe(400)
    expect(
      (await planRoute.PATCH(req('PATCH', { plan: 'FULL', expiresAt: '2020-01-01' }), params)).status
    ).toBe(400)
    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })

  it('unbekannter Nutzer: 404', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ ...TEST_USER, isAdmin: true }).mockResolvedValueOnce(null)
    expect((await planRoute.PATCH(req('PATCH', { plan: 'FULL' }), params)).status).toBe(404)
  })

  it('setzt das Level von Hand und protokolliert die Änderung', async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce({ ...TEST_USER, isAdmin: true })
      .mockResolvedValueOnce({ id: 'user-2', plan: 'BASIC' })
    prismaMock.user.update.mockResolvedValue({
      id: 'user-2',
      plan: 'FULL',
      planSource: 'MANUAL',
      planExpiresAt: null,
    })

    const response = await planRoute.PATCH(
      req('PATCH', { plan: 'FULL', expiresAt: '2099-01-01', note: ' Geschenk ' }),
      params
    )
    expect(response.status).toBe(200)
    expect(prismaMock.planChange.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-2',
        fromPlan: 'BASIC',
        toPlan: 'FULL',
        source: 'MANUAL',
        note: 'Geschenk',
        changedById: TEST_USER.id,
        expiresAt: new Date('2099-01-01'),
      }),
    })
    expect(prismaMock.user.update.mock.calls[0][0].data).toEqual({
      plan: 'FULL',
      planSource: 'MANUAL',
      planExpiresAt: new Date('2099-01-01'),
    })
  })

  it('„Start“ hat nie ein Ablaufdatum', async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce({ ...TEST_USER, isAdmin: true })
      .mockResolvedValueOnce({ id: 'user-2', plan: 'FULL' })
    prismaMock.user.update.mockResolvedValue({ id: 'user-2', plan: 'BASIC', planSource: 'MANUAL', planExpiresAt: null })

    await planRoute.PATCH(req('PATCH', { plan: 'BASIC', expiresAt: '2099-01-01' }), params)
    expect(prismaMock.user.update.mock.calls[0][0].data.planExpiresAt).toBeNull()
  })
})

describe('Nutzer löschen', () => {
  const del = (body?: unknown) => userRoute.DELETE(req('DELETE', body), params)
  const target = { id: 'user-2', email: 'anna@beispiel.de', isAdmin: false }
  const asAdmin = (found: unknown) =>
    prismaMock.user.findUnique
      .mockResolvedValueOnce({ ...TEST_USER, isAdmin: true })
      .mockResolvedValueOnce(found)

  it('ohne Admin-Recht: 404, nichts wird gelöscht', async () => {
    loginAs()
    expect((await del({ confirmEmail: target.email })).status).toBe(404)
    expect(prismaMock.user.delete).not.toHaveBeenCalled()
  })

  it('verlangt die passende E-Mail-Adresse', async () => {
    loginAs({ user: { isAdmin: true } })
    asAdmin(target)
    expect((await del({ confirmEmail: 'falsch@beispiel.de' })).status).toBe(400)
    expect(prismaMock.user.delete).not.toHaveBeenCalled()
  })

  it('löscht weder die eigene Anmeldung noch andere Admins', async () => {
    loginAs({ user: { isAdmin: true } })
    asAdmin({ id: TEST_USER.id, email: TEST_USER.email, isAdmin: true })
    expect((await del({ confirmEmail: TEST_USER.email })).status).toBe(400)

    asAdmin({ ...target, isAdmin: true })
    expect((await del({ confirmEmail: target.email })).status).toBe(400)
    expect(prismaMock.user.delete).not.toHaveBeenCalled()
  })

  it('löscht eigene Konten, erhält geteilte und übergibt die Inhaberschaft', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {})
    loginAs({ user: { isAdmin: true } })
    asAdmin(target)
    const member = (id: string, userId: string, role: string, day: string) => ({
      id,
      userId,
      role,
      createdAt: new Date(day),
    })
    const own = member('m1', 'user-2', 'OWNER', '2026-01-01')
    const sharedOwner = member('m2', 'user-2', 'OWNER', '2026-01-01')
    prismaMock.accountMember.findMany.mockResolvedValue([
      { ...own, account: { id: 'solo', members: [own] } },
      {
        ...sharedOwner,
        account: {
          id: 'shared',
          members: [
            sharedOwner,
            member('m4', 'user-4', 'MEMBER', '2026-03-01'),
            member('m3', 'user-3', 'READ_ONLY', '2026-02-01'),
          ],
        },
      },
    ])

    const response = await del({ confirmEmail: ' Anna@Beispiel.de ' })
    expect(response.status).toBe(200)
    expect(prismaMock.account.delete).toHaveBeenCalledTimes(1)
    expect(prismaMock.account.delete).toHaveBeenCalledWith({ where: { id: 'solo' } })
    expect(prismaMock.accountMember.update).toHaveBeenCalledWith({
      where: { id: 'm3' },
      data: { role: 'OWNER' },
    })
    expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: 'user-2' } })
  })
})
