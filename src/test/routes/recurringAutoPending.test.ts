import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', async () => (await import('@/test/routeHarness')).prismaModule)
vi.mock('@/lib/auth', async () => (await import('@/test/routeHarness')).authModule)

import dayjs from 'dayjs'
import { NextRequest } from 'next/server'
import * as autoPendingRoute from '@/app/api/transactions/auto-pending/route'
import * as settingsRoute from '@/app/api/users/settings/route'
import * as navBadgesRoute from '@/app/api/nav-badges/route'
import * as transactionRoute from '@/app/api/transactions/[id]/route'
import { getAvailableBalance } from '@/lib/availableBalance'
import '@/lib/dateUtils'
import { jsonRequest, loginAs, prismaMock, resetRouteMocks, routeParams, TEST_ACCOUNT } from '@/test/routeHarness'

const berlin = (iso: string) => dayjs.tz(iso, 'Europe/Berlin').toDate()
const NOW = new Date('2026-10-10T12:00:00+02:00')

let counter = 0
beforeEach(() => {
  resetRouteMocks()
  counter += 1
  loginAs({ user: { id: `auto-user-${counter}` } })
})

describe('POST /api/transactions/auto-pending', () => {
  it('trägt fällige Termine ein und liefert die neuen Buchungen', async () => {
    prismaMock.transaction.findMany
      .mockResolvedValueOnce([
        {
          id: 'miete',
          // am 1. jedes Monats, seit zwei Monaten – im laufenden Gehaltsmonat (Gehaltstag 1) fällig
          date: dayjs().tz('Europe/Berlin').startOf('month').subtract(2, 'month').toDate(),
          recurringInterval: 'monthly',
          autoPendingUntil: null,
          amount: -950,
          merchant: 'Vermieter',
          isTransfer: false,
        },
      ])
    prismaMock.transaction.groupBy.mockResolvedValueOnce([])
    prismaMock.transaction.updateMany.mockResolvedValue({ count: 1 })
    prismaMock.transaction.create.mockResolvedValue({ id: 'neu' })
    prismaMock.transaction.findUniqueOrThrow.mockResolvedValue({ id: 'neu', merchant: 'Vermieter' })

    const response = await autoPendingRoute.POST()
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([{ id: 'neu', merchant: 'Vermieter' }])
  })

  it('Nur-Lesen: still eine leere Liste, nichts angelegt', async () => {
    loginAs({ role: 'READ_ONLY', user: { id: `auto-ro-${counter}` } })
    const response = await autoPendingRoute.POST()
    expect(await response.json()).toEqual([])
    expect(prismaMock.transaction.findMany).not.toHaveBeenCalled()
  })
})

describe('Einstellung „Wiederkehrende Zahlungen eintragen“', () => {
  const patch = (body: unknown) =>
    settingsRoute.PATCH(new NextRequest(jsonRequest('PATCH', body, 'http://localhost/api/users/settings')))

  it('wird geliefert und gespeichert', async () => {
    expect((await (await settingsRoute.GET()).json()).recurringAutoMode).toBe('SALARY_MONTH')
    prismaMock.account.update.mockResolvedValue({ ...TEST_ACCOUNT, recurringAutoMode: 'ON_DUE_DATE' })
    const response = await patch({ recurringAutoMode: 'ON_DUE_DATE' })
    expect(response.status).toBe(200)
    expect(prismaMock.account.update).toHaveBeenCalledWith({
      where: { id: TEST_ACCOUNT.id },
      data: { recurringAutoMode: 'ON_DUE_DATE' },
    })
    expect((await response.json()).recurringAutoMode).toBe('ON_DUE_DATE')
  })

  it('ungültiger Wert: 400', async () => {
    expect((await patch({ recurringAutoMode: 'DAYS_BEFORE' })).status).toBe(400)
    expect(prismaMock.account.update).not.toHaveBeenCalled()
  })
})

describe('„Verfügbar“', () => {
  const account = { id: TEST_ACCOUNT.id, salaryDay: 1 }

  function given({
    confirmed = 2000,
    open = 0,
    templates = [] as Record<string, unknown>[],
    instanceCounts = {} as Record<string, number>,
  }) {
    prismaMock.transaction.aggregate
      .mockResolvedValueOnce({ _sum: { amount: { toNumber: () => confirmed } } })
      .mockResolvedValueOnce({ _sum: { amount: { toNumber: () => -open } } })
    prismaMock.transaction.findMany.mockResolvedValueOnce(
      templates.map((t) => ({ recurringInterval: 'monthly', autoPendingUntil: null, ...t, amount: { toNumber: () => t.amount } }))
    )
    prismaMock.transaction.groupBy.mockResolvedValueOnce(
      Object.entries(instanceCounts).map(([parentTransactionId, _count]) => ({ parentTransactionId, _count }))
    )
  }

  it('Vorlage mit eingetragener Buchung zählt nur einmal (als Buchung)', async () => {
    given({
      open: 950,
      templates: [{ id: 'miete', date: berlin('2026-09-05'), amount: -950 }],
      instanceCounts: { miete: 1 },
    })
    const balance = await getAvailableBalance(account, NOW)
    expect(balance).toMatchObject({ openExpenses: 950, plannedRecurringExpenses: 0, available: 1050 })
  })

  it('noch nicht eingetragener Termin im Gehaltsmonat zählt als Prognose', async () => {
    given({ templates: [{ id: 'strom', date: berlin('2026-09-25'), amount: -60 }] })
    const balance = await getAvailableBalance(account, NOW)
    expect(balance).toMatchObject({ plannedRecurringExpenses: 60, totalPendingExpenses: 60, available: 1940 })
  })

  it('bewusst gelöschter Termin (vor der Marke) zählt nicht', async () => {
    given({ templates: [{ id: 'strom', date: berlin('2026-09-25'), amount: -60, autoPendingUntil: berlin('2026-10-25') }] })
    expect((await getAvailableBalance(account, NOW)).plannedRecurringExpenses).toBe(0)
  })

  it('Vorlage mit Datum im Gehaltsmonat ist selbst die Buchung – keine zusätzliche Prognose', async () => {
    given({ open: 30, templates: [{ id: 'neu', date: berlin('2026-10-08'), amount: -30 }] })
    expect(await getAvailableBalance(account, NOW)).toMatchObject({ plannedRecurringExpenses: 0, available: 1970 })
  })

  it('Kontostand und offene Buchungen schließen Vorlagen ein (sie sind Buchungen), offene nur bis Ende des Gehaltsmonats', async () => {
    given({})
    await getAvailableBalance(account, NOW)
    const [confirmedWhere, openWhere] = prismaMock.transaction.aggregate.mock.calls.map((call) => call[0].where)
    expect(confirmedWhere).not.toHaveProperty('NOT')
    expect(openWhere).not.toHaveProperty('NOT')
    expect(openWhere).toMatchObject({ isConfirmed: false })
    expect(dayjs(openWhere.date.lte).tz('Europe/Berlin').format('YYYY-MM-DD')).toBe('2026-10-31')
  })
})

describe('Navigationszähler „Wiederkehrend“', () => {
  it('ein bewusst gelöschter oder verschobener Termin mahnt nicht, ein offener schon', async () => {
    prismaMock.accountInvite.count.mockResolvedValue(0)
    prismaMock.splitListInvite.count.mockResolvedValue(0)
    prismaMock.transaction.count.mockResolvedValue(0)
    const start = dayjs().tz('Europe/Berlin').startOf('month').subtract(2, 'month')
    prismaMock.transaction.findMany
      .mockResolvedValueOnce([
        // Termin am 1. jedes Monats – in jedem Gehaltsmonat (Gehaltstag 1) fällig
        { id: 'offen', date: start.toDate(), recurringInterval: 'monthly', autoPendingUntil: null },
        { id: 'geloescht', date: start.toDate(), recurringInterval: 'monthly', autoPendingUntil: dayjs().add(40, 'day').toDate() },
        { id: 'verschoben', date: start.toDate(), recurringInterval: 'monthly', autoPendingUntil: null },
      ])
    // „verschoben“ hat im Gehaltsmonat schon eine Buchung (an einem anderen Tag)
    prismaMock.transaction.groupBy.mockResolvedValueOnce([{ parentTransactionId: 'verschoben', _count: 1 }])
    const body = await (await navBadgesRoute.GET()).json()
    expect(body.recurringAttention).toBe(1)
  })
})

describe('Vorlage bearbeiten', () => {
  const params = routeParams({ id: 'vorlage' })
  const existing = {
    ...TEST_ACCOUNT,
    id: 'vorlage',
    accountId: TEST_ACCOUNT.id,
    date: berlin('2026-09-05'),
    recurringInterval: 'monthly',
    isRecurring: true,
    parentTransactionId: null,
    autoPendingUntil: berlin('2026-10-05'),
    amount: -950,
    merchant: 'Vermieter',
    merchantId: null,
    isTransfer: false,
    transferTargetAccountId: null,
  }
  const patch = (body: unknown) =>
    transactionRoute.PATCH(new NextRequest(jsonRequest('PATCH', body, 'http://localhost/api/transactions/vorlage')), params)

  beforeEach(() => {
    prismaMock.transaction.findFirst.mockResolvedValue(existing)
    prismaMock.account.findUnique.mockResolvedValue(TEST_ACCOUNT)
    prismaMock.transaction.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      ...existing,
      ...data,
    }))
  })

  it('neuer Termin: Marke wird zurückgesetzt', async () => {
    expect((await patch({ date: '2026-09-20' })).status).toBe(200)
    expect(prismaMock.transaction.update.mock.calls[0][0].data.autoPendingUntil).toBeNull()
  })

  it('nur Betrag geändert: Marke bleibt', async () => {
    prismaMock.transaction.updateMany.mockResolvedValue({ count: 0 })
    prismaMock.transaction.findMany.mockResolvedValue([])
    expect((await patch({ amount: -990 })).status).toBe(200)
    expect(prismaMock.transaction.update.mock.calls[0][0].data).not.toHaveProperty('autoPendingUntil')
  })
})
