import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', async () => (await import('@/test/routeHarness')).prismaModule)
vi.mock('@/lib/auth', async () => (await import('@/test/routeHarness')).authModule)

import { NextRequest } from 'next/server'
import * as accountsRoute from '@/app/api/accounts/route'
import * as membersRoute from '@/app/api/accounts/[id]/members/route'
import * as statisticsRoute from '@/app/api/statistics/route'
import * as importRoute from '@/app/api/transactions/import/route'
import * as importPreviewRoute from '@/app/api/transactions/import/preview/route'
import * as splitListsRoute from '@/app/api/split/lists/route'
import * as shareRoute from '@/app/api/split/lists/[id]/share/route'
import * as keptAccountRoute from '@/app/api/users/kept-account/route'
import { getAccountContext, requireWritableContext } from '@/lib/account-context'
import { getSplitListAccess, requireSplitListWrite } from '@/lib/splitAccess'
import { getSplitListIdByShareToken } from '@/lib/splitShareToken'
import { PLAN_REQUIRED_CODE } from '@/lib/planGuards'
import { jsonRequest, loginAs, prismaMock, resetRouteMocks, routeParams, TEST_ACCOUNT, TEST_USER } from '@/test/routeHarness'

const BASIC = { plan: 'BASIC' as const, planSource: null }
const EXPIRED_TRIAL = {
  plan: 'FULL' as const,
  planSource: 'TRIAL' as const,
  planExpiresAt: new Date('2020-01-01'),
}

beforeEach(() => {
  resetRouteMocks()
  vi.stubEnv('PLANS_ENABLED', 'true')
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => vi.unstubAllEnvs())

const req = (method: string, body?: unknown) =>
  new NextRequest(jsonRequest(method, body, 'http://localhost/api/x'))

/** 403 mit der Kennung, an der die Oberfläche eine Level-Sperre erkennt */
async function expectPlanRequired(response: Response) {
  expect(response.status).toBe(403)
  expect((await response.json()).code).toBe(PLAN_REQUIRED_CODE)
}

async function writeErrorOf() {
  const ctx = await getAccountContext()
  if (ctx instanceof Response) throw new Error('erwartet Kontext')
  return { ctx, error: requireWritableContext(ctx) }
}

describe('Kontolimit', () => {
  it('„Start“ darf kein zweites Konto anlegen', async () => {
    loginAs({ user: BASIC })
    prismaMock.accountMember.count.mockResolvedValue(1)
    await expectPlanRequired(await accountsRoute.POST(req('POST', { name: 'Zweites' })))
    expect(prismaMock.account.create).not.toHaveBeenCalled()
  })

  it('gilt auch nach abgelaufener Testphase', async () => {
    loginAs({ user: EXPIRED_TRIAL })
    prismaMock.accountMember.count.mockResolvedValue(1)
    await expectPlanRequired(await accountsRoute.POST(req('POST', { name: 'Zweites' })))
  })

  it('„Komplett“ darf weitere Konten anlegen', async () => {
    loginAs()
    prismaMock.account.create.mockResolvedValue({ ...TEST_ACCOUNT, id: 'account-2' })
    const response = await accountsRoute.POST(req('POST', { name: 'Zweites', salaryDay: 1 }))
    expect(response.status).toBe(201)
    expect(prismaMock.accountMember.count).not.toHaveBeenCalled()
  })

  it('ohne PLANS_ENABLED gibt es keine Grenze', async () => {
    vi.stubEnv('PLANS_ENABLED', 'false')
    loginAs({ user: BASIC })
    prismaMock.account.create.mockResolvedValue({ ...TEST_ACCOUNT, id: 'account-2' })
    const response = await accountsRoute.POST(req('POST', { name: 'Zweites', salaryDay: 1 }))
    expect(response.status).toBe(201)
  })
})

describe('Funktionen des Kontos folgen dem Level des Inhabers', () => {
  it('Statistiken: gesperrt, wenn der Inhaber „Start“ hat', async () => {
    loginAs({ user: BASIC })
    await expectPlanRequired(await statisticsRoute.GET(new Request('http://localhost/api/statistics')))
    expect(prismaMock.transaction.findMany).not.toHaveBeenCalled()
  })

  it('Statistiken: Mitglied mit „Start“ sieht sie im Konto eines „Komplett“-Inhabers', async () => {
    loginAs({ role: 'MEMBER', user: BASIC, ownerPlan: 'FULL' })
    prismaMock.transaction.findMany.mockResolvedValue([])
    const response = await statisticsRoute.GET(new Request('http://localhost/api/statistics'))
    expect(response.status).not.toBe(403)
  })

  it('CSV-Import: Vorschau und Übernahme gesperrt', async () => {
    loginAs({ user: BASIC })
    await expectPlanRequired(await importPreviewRoute.POST(jsonRequest('POST', { csvText: 'a;b' })))
    await expectPlanRequired(await importRoute.POST(jsonRequest('POST', { rows: [] })))
  })

  it('Teilen: Inhaber mit „Start“ kann niemanden einladen', async () => {
    loginAs({ user: BASIC })
    const response = await membersRoute.POST(
      req('POST', { email: 'x@beispiel.de' }),
      routeParams({ id: TEST_ACCOUNT.id })
    )
    await expectPlanRequired(response)
    expect(prismaMock.accountInvite.upsert).not.toHaveBeenCalled()
  })
})

describe('Schreibschutz nach Herabstufung', () => {
  it('ein Konto auf „Start“: beschreibbar', async () => {
    loginAs({ user: BASIC })
    const { ctx, error } = await writeErrorOf()
    expect(ctx.planLock).toBeNull()
    expect(error).toBeNull()
  })

  it('überzähliges Konto: schreibgeschützt, das älteste bleibt beschreibbar', async () => {
    loginAs({ user: BASIC, ownedAccountIds: ['account-0', TEST_ACCOUNT.id] })
    const locked = await writeErrorOf()
    expect(locked.ctx.planLock).toBe('limit')
    await expectPlanRequired(locked.error!)

    loginAs({ user: BASIC, ownedAccountIds: [TEST_ACCOUNT.id, 'account-2'] })
    expect((await writeErrorOf()).error).toBeNull()
  })

  it('„Komplett“ mit mehreren Konten: kein Schreibschutz', async () => {
    loginAs({ ownedAccountIds: ['account-0', TEST_ACCOUNT.id] })
    expect((await writeErrorOf()).error).toBeNull()
  })

  it('Mitglied eines Kontos, dessen Inhaber „Start“ hat: nur lesen', async () => {
    loginAs({ role: 'MEMBER', ownerPlan: 'BASIC' })
    const { ctx, error } = await writeErrorOf()
    expect(ctx.planLock).toBe('shared')
    await expectPlanRequired(error!)
  })

  it('Mitglied mit „Start“ im Konto eines „Komplett“-Inhabers: darf schreiben', async () => {
    loginAs({ role: 'MEMBER', user: BASIC, ownerPlan: 'FULL' })
    expect((await writeErrorOf()).error).toBeNull()
  })
})

describe('Beschreibbares Konto wählen', () => {
  const DAY = 24 * 60 * 60 * 1000
  const owns = (...ids: string[]) =>
    prismaMock.accountMember.findMany.mockResolvedValue(ids.map((accountId) => ({ accountId })))
  const choose = (accountId: string) => keptAccountRoute.PATCH(req('PATCH', { accountId }))

  it('nur eigene Konten', async () => {
    loginAs({ user: BASIC })
    owns(TEST_ACCOUNT.id)
    expect((await choose('account-9')).status).toBe(403)
    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })

  it('die erste Wahl ist frei und startet die Frist', async () => {
    loginAs({ user: BASIC })
    owns(TEST_ACCOUNT.id, 'account-2')
    expect((await choose('account-2')).status).toBe(200)
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: TEST_USER.id },
      data: { keptAccountId: 'account-2', keptAccountChangedAt: expect.any(Date) },
    })
  })

  it('nach gewählter Auswahl: dasselbe Konto erneut zu wählen ändert nichts und kostet keine Frist', async () => {
    loginAs({ user: { ...BASIC, keptAccountId: 'account-2', keptAccountChangedAt: new Date() } })
    owns(TEST_ACCOUNT.id, 'account-2')
    expect((await choose('account-2')).status).toBe(200)
    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })

  it('steht die Wahl aus, wird auch das Bestätigen des bisherigen Kontos vermerkt', async () => {
    loginAs({ user: BASIC })
    owns(TEST_ACCOUNT.id, 'account-2')
    expect((await choose(TEST_ACCOUNT.id)).status).toBe(200)
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: TEST_USER.id },
      data: { keptAccountId: TEST_ACCOUNT.id, keptAccountChangedAt: expect.any(Date) },
    })
  })

  it('nach einer erneuten Herabstufung ist die Wahl frei, auch innerhalb der Frist', async () => {
    loginAs({
      user: { ...BASIC, keptAccountId: 'account-2', keptAccountChangedAt: new Date(Date.now() - 10 * DAY) },
    })
    owns(TEST_ACCOUNT.id, 'account-2')
    prismaMock.planChange.findFirst.mockResolvedValue({ createdAt: new Date(Date.now() - DAY) })
    expect((await choose(TEST_ACCOUNT.id)).status).toBe(200)
    expect(prismaMock.user.update).toHaveBeenCalledTimes(1)
  })

  it('ein weiterer Wechsel ist erst nach 60 Tagen möglich', async () => {
    const recently = new Date(Date.now() - 59 * DAY)
    loginAs({ user: { ...BASIC, keptAccountId: 'account-2', keptAccountChangedAt: recently } })
    owns(TEST_ACCOUNT.id, 'account-2')
    const blocked = await choose(TEST_ACCOUNT.id)
    expect(blocked.status).toBe(409)
    expect((await blocked.json()).allowedAt).toBe(new Date(recently.getTime() + 60 * DAY).toISOString())
    expect(prismaMock.user.update).not.toHaveBeenCalled()

    loginAs({
      user: { ...BASIC, keptAccountId: 'account-2', keptAccountChangedAt: new Date(Date.now() - 61 * DAY) },
    })
    owns(TEST_ACCOUNT.id, 'account-2')
    expect((await choose(TEST_ACCOUNT.id)).status).toBe(200)
    expect(prismaMock.user.update).toHaveBeenCalledTimes(1)
  })
})

describe('Split', () => {
  const listMembership = (creatorPlan: 'BASIC' | 'FULL', role: 'OWNER' | 'MEMBER' = 'OWNER') => ({
    role,
    splitList: { status: 'ACTIVE', createdBy: { plan: creatorPlan, planExpiresAt: null } },
  })

  it('„Start“ kann keine eigene Liste anlegen', async () => {
    loginAs({ user: BASIC })
    await expectPlanRequired(await splitListsRoute.POST(jsonRequest('POST', { name: 'Urlaub' })))
    expect(prismaMock.splitList.create).not.toHaveBeenCalled()
  })

  it('Liste eines „Start“-Erstellers ist für alle nur lesbar', async () => {
    prismaMock.splitListMember.findUnique.mockResolvedValue(listMembership('BASIC', 'MEMBER'))
    const access = await getSplitListAccess('user-2', 'list-1')
    expect(access?.planLocked).toBe(true)
    await expectPlanRequired(requireSplitListWrite(access!)!)
  })

  it('eingeladen in die Liste eines „Komplett“-Erstellers: darf schreiben', async () => {
    prismaMock.splitListMember.findUnique.mockResolvedValue(listMembership('FULL', 'MEMBER'))
    const access = await getSplitListAccess(TEST_USER.id, 'list-1')
    expect(access?.planLocked).toBe(false)
    expect(requireSplitListWrite(access!)).toBeNull()
  })

  it('Freigabe-Link: einschalten gesperrt, ausschalten erlaubt', async () => {
    loginAs({ user: BASIC })
    prismaMock.splitListMember.findUnique.mockResolvedValue(listMembership('BASIC'))
    const params = routeParams({ id: 'list-1' })
    await expectPlanRequired(await shareRoute.PATCH(req('PATCH', { shareEnabled: true }), params))
    await expectPlanRequired(await shareRoute.POST(req('POST'), params))

    prismaMock.splitList.update.mockResolvedValue({ shareEnabled: false, shareEnabledAt: null })
    expect((await shareRoute.PATCH(req('PATCH', { shareEnabled: false }), params)).status).toBe(200)
  })

  it('öffentlicher Link ruht, solange der Ersteller „Start“ hat', async () => {
    prismaMock.splitList.findFirst.mockResolvedValue({
      id: 'list-1',
      createdBy: { plan: 'BASIC', planExpiresAt: null },
    })
    expect(await getSplitListIdByShareToken('token')).toBeNull()

    prismaMock.splitList.findFirst.mockResolvedValue({
      id: 'list-1',
      createdBy: { plan: 'FULL', planExpiresAt: null },
    })
    expect(await getSplitListIdByShareToken('token')).toBe('list-1')
  })
})
