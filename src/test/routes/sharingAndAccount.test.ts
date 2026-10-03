import { beforeEach, describe, expect, it, vi } from 'vitest'
import bcrypt from 'bcryptjs'

vi.mock('@/lib/prisma', async () => (await import('@/test/routeHarness')).prismaModule)
vi.mock('@/lib/auth', async () => (await import('@/test/routeHarness')).authModule)

import { NextRequest } from 'next/server'
import * as membersRoute from '@/app/api/accounts/[id]/members/route'
import * as participantsRoute from '@/app/api/split/lists/[id]/participants/route'
import * as passwordRoute from '@/app/api/users/password/route'
import * as backupRoute from '@/app/api/backup/route'
import * as undoRoute from '@/app/api/transactions/create-pending/undo/route'
import { jsonRequest, loginAs, prismaMock, resetRouteMocks, routeParams, TEST_ACCOUNT, TEST_USER } from '@/test/routeHarness'

beforeEach(() => {
  resetRouteMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

const req = (method: string, body?: unknown) =>
  new NextRequest(jsonRequest(method, body, 'http://localhost/api/x'))

describe('Konto teilen (Mitglieder)', () => {
  const params = routeParams({ id: TEST_ACCOUNT.id })

  it('Nicht-Mitglied: 403', async () => {
    loginAs()
    prismaMock.accountMember.findUnique.mockResolvedValue(null)
    expect((await membersRoute.GET(req('GET'), params)).status).toBe(403)
    expect(prismaMock.accountMember.findMany).not.toHaveBeenCalled()
  })

  it('Mitglied ohne Inhaberrolle darf Mitglieder weder sehen noch einladen (403)', async () => {
    loginAs({ role: 'MEMBER' })
    expect((await membersRoute.GET(req('GET'), params)).status).toBe(403)
    expect((await membersRoute.POST(req('POST', { email: 'x@beispiel.de' }), params)).status).toBe(403)
    expect(prismaMock.accountInvite.upsert).not.toHaveBeenCalled()
  })

  it('Inhaber kann sich nicht selbst einladen (400)', async () => {
    loginAs()
    const response = await membersRoute.POST(req('POST', { email: TEST_USER.email }), params)
    expect(response.status).toBe(400)
  })

  it('die Inhaberrolle lässt sich nicht vergeben (nur MEMBER oder READ_ONLY)', async () => {
    loginAs()
    const response = await membersRoute.PATCH(req('PATCH', { memberId: 'm2', role: 'OWNER' }), params)
    expect(response.status).toBe(400)
    expect(prismaMock.accountMember.update).not.toHaveBeenCalled()
  })
})

describe('Split-Teilnehmer per E-Mail', () => {
  const params = routeParams({ id: 'liste-1' })

  function asListMember() {
    loginAs()
    prismaMock.splitListMember.findUnique.mockResolvedValue({
      splitListId: 'liste-1',
      userId: TEST_USER.id,
      role: 'OWNER',
      splitList: { status: 'ACTIVE' },
    })
    prismaMock.splitParticipant.count.mockResolvedValue(0)
    prismaMock.splitParticipant.findMany.mockResolvedValue([])
    prismaMock.splitParticipant.findFirst.mockResolvedValue(null)
    prismaMock.splitParticipant.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'p1',
      createdAt: new Date('2026-10-01'),
      ...data,
    }))
  }

  it('Nicht-Mitglied der Liste: 404', async () => {
    loginAs()
    prismaMock.splitListMember.findUnique.mockResolvedValue(null)
    expect((await participantsRoute.POST(req('POST', { displayName: 'Anna' }), params)).status).toBe(404)
  })

  it('fremde Adresse wird nur eingeladen – keine Mitgliedschaft, keine Auskunft über ein Konto', async () => {
    asListMember()
    const response = await participantsRoute.POST(req('POST', { email: 'andere@beispiel.de' }), params)
    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body).toMatchObject({ displayName: 'andere', userId: null, hasAccount: false, pendingInvite: true })
    // Nach der fremden Adresse wird gar nicht erst gesucht
    expect(prismaMock.user.findUnique).toHaveBeenCalledTimes(1)
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { id: TEST_USER.id } })
    expect(prismaMock.splitListMember.create).not.toHaveBeenCalled()
    expect(prismaMock.splitListInvite.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ email: 'andere@beispiel.de', status: 'PENDING' }) })
    )
  })
})

describe('Passwort ändern', () => {
  it('falsches aktuelles Passwort: 400, nichts geändert', async () => {
    loginAs({ user: { passwordHash: bcrypt.hashSync('Richtig123', 4) } })
    const response = await passwordRoute.PATCH(jsonRequest('PATCH', { currentPassword: 'Falsch123', newPassword: 'NeuesPw456' }))
    expect(response.status).toBe(400)
    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })

  it('zu schwaches neues Passwort: 400', async () => {
    loginAs({ user: { passwordHash: bcrypt.hashSync('Richtig123', 4) } })
    const response = await passwordRoute.PATCH(jsonRequest('PATCH', { currentPassword: 'Richtig123', newPassword: 'kurz' }))
    expect(response.status).toBe(400)
    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })

  it('Erfolg: neuer Hash und höhere Sitzungs-Version (andere Sitzungen enden)', async () => {
    loginAs({ user: { passwordHash: bcrypt.hashSync('Richtig123', 4) } })
    const response = await passwordRoute.PATCH(jsonRequest('PATCH', { currentPassword: 'Richtig123', newPassword: 'NeuesPw456' }))
    expect(response.status).toBe(200)
    const update = prismaMock.user.update.mock.calls[0][0] as { where: unknown; data: { passwordHash: string; sessionVersion: unknown } }
    expect(update.where).toEqual({ id: TEST_USER.id })
    expect(update.data.sessionVersion).toEqual({ increment: 1 })
    expect(bcrypt.compareSync('NeuesPw456', update.data.passwordHash)).toBe(true)
  })
})

describe('Backup', () => {
  it('Export enthält nur Daten des aktiven Kontos', async () => {
    loginAs({ role: 'READ_ONLY' })
    for (const model of ['category', 'merchant', 'merchantCategory', 'transaction']) {
      prismaMock[model].findMany.mockResolvedValue([])
    }
    expect((await backupRoute.GET()).status).toBe(200)
    expect(prismaMock.transaction.findMany).toHaveBeenCalledWith({ where: { accountId: TEST_ACCOUNT.id } })
    expect(prismaMock.category.findMany).toHaveBeenCalledWith({ where: { accountId: TEST_ACCOUNT.id } })
  })

  it('Nur-Lesen-Mitglied darf nicht wiederherstellen (403), nichts gelöscht', async () => {
    loginAs({ role: 'READ_ONLY' })
    const response = await backupRoute.POST(jsonRequest('POST', { version: '1.0', categories: [], merchants: [], transactions: [] }))
    expect(response.status).toBe(403)
    expect(prismaMock.transaction.deleteMany).not.toHaveBeenCalled()
  })
})

describe('„Ausstehende erstellen“ rückgängig', () => {
  const item = {
    id: 't1',
    merchant: 'Miete',
    description: null,
    amount: -750,
    date: '2026-10-01T00:00:00.000Z',
    categoryId: null,
  }

  it('sucht nur Instanzen wiederkehrender Zahlungen im aktiven Konto', async () => {
    loginAs()
    prismaMock.transaction.findMany.mockResolvedValue([])
    const response = await undoRoute.POST(new NextRequest(jsonRequest('POST', { items: [item] })))
    expect(response.status).toBe(200)
    expect(prismaMock.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          accountId: TEST_ACCOUNT.id,
          isRecurring: false,
          parentTransactionId: { not: null },
        }),
      })
    )
  })

  it('geänderte Buchung: erst nachfragen, nichts löschen', async () => {
    loginAs()
    prismaMock.transaction.findMany.mockResolvedValue([
      {
        ...item,
        date: new Date(item.date),
        amount: { toString: () => '-800' },
        isConfirmed: false,
        transferPairAsSource: null,
      },
    ])
    const response = await undoRoute.POST(new NextRequest(jsonRequest('POST', { items: [item] })))
    expect(await response.json()).toMatchObject({ status: 'needs-confirmation', unchangedCount: 0 })
    expect(prismaMock.transaction.deleteMany).not.toHaveBeenCalled()
  })

  it('Nur-Lesen-Mitglied: 403', async () => {
    loginAs({ role: 'READ_ONLY' })
    const response = await undoRoute.POST(new NextRequest(jsonRequest('POST', { items: [item] })))
    expect(response.status).toBe(403)
  })
})
