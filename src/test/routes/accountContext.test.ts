import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', async () => (await import('@/test/routeHarness')).prismaModule)
vi.mock('@/lib/auth', async () => (await import('@/test/routeHarness')).authModule)

import { getAccountContext, getUserBySession } from '@/lib/account-context'
import { authMock, loginAs, prismaMock, resetRouteMocks, TEST_ACCOUNT, TEST_USER } from '@/test/routeHarness'

beforeEach(() => resetRouteMocks())

const statusOf = (result: unknown) => (result instanceof Response ? result.status : 'ok')

describe('Sitzungsauflösung', () => {
  it('ohne Sitzung: 401', async () => {
    expect(statusOf(await getUserBySession())).toBe(401)
  })

  it('lädt den Nutzer über die ID aus dem Token, nicht über die E-Mail', async () => {
    loginAs()
    expect(statusOf(await getUserBySession())).toBe('ok')
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { id: TEST_USER.id } })
  })

  it('nach E-Mail-Wechsel gilt die alte Sitzung nicht mehr (404)', async () => {
    loginAs({ user: { email: 'neue@beispiel.de' } })
    expect(statusOf(await getUserBySession())).toBe(404)
  })

  it('nach Passwortwechsel (höhere Sitzungs-Version) gilt die alte Sitzung nicht mehr (401)', async () => {
    loginAs({ user: { sessionVersion: 1 }, sessionVersion: 0 })
    expect(statusOf(await getUserBySession())).toBe(401)
  })
})

describe('Kontokontext', () => {
  it('liefert Konto und Mitgliedschaft des aktiven Kontos', async () => {
    loginAs({ role: 'READ_ONLY' })
    const ctx = await getAccountContext()
    if (ctx instanceof Response) throw new Error('erwartet Kontext')
    expect(ctx.account.id).toBe(TEST_ACCOUNT.id)
    expect(ctx.membership.role).toBe('READ_ONLY')
    expect(prismaMock.accountMember.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { accountId_userId: { accountId: TEST_ACCOUNT.id, userId: TEST_USER.id } },
      })
    )
  })

  it('ohne Zugriff auf das gewählte Konto: Rückfall auf das erste eigene Konto', async () => {
    loginAs()
    prismaMock.accountMember.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'm2', accountId: 'account-2', userId: TEST_USER.id, role: 'MEMBER', account: { ...TEST_ACCOUNT, id: 'account-2' } })
    prismaMock.accountMember.findFirst.mockResolvedValue({ accountId: 'account-2' })
    const ctx = await getAccountContext()
    if (ctx instanceof Response) throw new Error('erwartet Kontext')
    expect(ctx.account.id).toBe('account-2')
  })

  it('ohne irgendein Konto: 403', async () => {
    loginAs()
    prismaMock.accountMember.findUnique.mockResolvedValue(null)
    prismaMock.accountMember.findFirst.mockResolvedValue(null)
    expect(statusOf(await getAccountContext())).toBe(403)
  })

  it('ohne Sitzung: 401, ohne Datenbankabfrage', async () => {
    authMock.mockResolvedValue(null)
    expect(statusOf(await getAccountContext())).toBe(401)
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled()
  })
})
