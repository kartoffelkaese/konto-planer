import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', async () => (await import('@/test/routeHarness')).prismaModule)
vi.mock('@/lib/auth', async () => (await import('@/test/routeHarness')).authModule)

import * as detectRoute from '@/app/api/transactions/recurring/detect/route'
import * as bulkRoute from '@/app/api/transactions/recurring/bulk/route'
import * as importPreviewRoute from '@/app/api/transactions/import/preview/route'
import { isPublicApiPath } from '@/lib/public-api'
import { jsonRequest, loginAs, prismaMock, resetRouteMocks, TEST_ACCOUNT } from '@/test/routeHarness'

const BASIC = { plan: 'BASIC' as const, planSource: null }

/** DKB-Export: 12 Monate Miete und Netflix, dazu ein einzelner Einkauf */
function dkbCsv() {
  const lines = ['Buchungsdatum;Status;Zahlungspflichtige*r;Zahlungsempfänger*in;Verwendungszweck;Umsatztyp;Betrag (€)']
  for (let i = 0; i < 12; i++) {
    const month = ((9 + i) % 12) + 1
    const year = 2025 + Math.floor((9 + i) / 12)
    const mm = String(month).padStart(2, '0')
    lines.push(`01.${mm}.${year};Gebucht;Ich;Vermieter;Miete;Ausgang;-950,00`)
    lines.push(`03.${mm}.${year};Gebucht;Ich;Netflix International;Abo;Ausgang;-12,99`)
  }
  lines.push('15.03.2026;Gebucht;Ich;Baumarkt;Einkauf;Ausgang;-84,20')
  return lines.join('\n')
}

let ipCounter = 0
const detect = (body: unknown) =>
  detectRoute.POST(jsonRequest('POST', body, 'http://localhost/api/transactions/recurring/detect'))
const bulk = (body: unknown) =>
  bulkRoute.POST(jsonRequest('POST', body, 'http://localhost/api/transactions/recurring/bulk'))

beforeEach(() => {
  resetRouteMocks()
  // Eigener Nutzer je Test, damit sich die Rate-Limits nicht in die Quere kommen
  ipCounter += 1
  loginAs({ user: { id: `user-${ipCounter}` } })
  prismaMock.merchant.findMany.mockResolvedValue([])
  prismaMock.transaction.findMany.mockResolvedValue([])
  prismaMock.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prismaMock))
})

describe('POST /api/transactions/recurring/detect', () => {
  it('braucht eine Anmeldung', () => {
    expect(isPublicApiPath('/api/transactions/recurring/detect')).toBe(false)
  })

  it('schlägt wiederkehrende Zahlungen vor – auch mit „Start“', async () => {
    loginAs({ user: { ...BASIC, id: `user-basic-${ipCounter}` } })
    const response = await detect({ csvText: dkbCsv(), formatId: 'dkbExport' })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.formatId).toBe('dkbExport')
    expect(body.suggestions.map((s: { name: string }) => s.name)).toEqual(['Vermieter', 'Netflix International'])
    expect(body.suggestions[0]).toMatchObject({ amount: -950, interval: 'monthly', preselected: true })
    // Nichts wird gespeichert
    expect(prismaMock.transaction.create).not.toHaveBeenCalled()
  })

  it('ohne Bank am Konto: Formatwahl verlangt', async () => {
    const response = await detect({ csvText: dkbCsv() })
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.code).toBe('FORMAT_REQUIRED')
    expect(body.availableFormats.length).toBeGreaterThan(0)
  })

  it('nutzt die Bank des Kontos', async () => {
    prismaMock.accountMember.findUnique.mockResolvedValue({
      ...(await prismaMock.accountMember.findUnique()),
      account: { ...TEST_ACCOUNT, bankId: 'dkb', members: [{ user: { plan: 'FULL', planExpiresAt: null, keptAccountId: null, memberships: [{ accountId: TEST_ACCOUNT.id }] } }] },
    })
    const response = await detect({ csvText: dkbCsv() })
    expect(response.status).toBe(200)
  })

  it('schreibgeschützt: 403', async () => {
    loginAs({ role: 'READ_ONLY', user: { id: `user-ro-${ipCounter}` } })
    expect((await detect({ csvText: dkbCsv(), formatId: 'dkbExport' })).status).toBe(403)
  })

  it('leere oder zu große Datei: 400', async () => {
    expect((await detect({ csvText: '  ' })).status).toBe(400)
    expect((await detect({ csvText: 'x'.repeat(2 * 1024 * 1024 + 1), formatId: 'dkbExport' })).status).toBe(400)
  })
})

describe('POST /api/transactions/recurring/bulk', () => {
  const item = { merchant: 'Vermieter', amount: -950, date: '2026-09-01', recurringInterval: 'monthly' }

  beforeEach(() => {
    prismaMock.merchant.findMany.mockResolvedValue([{ id: 'm-alt', name: 'Netflix' }])
    prismaMock.merchant.create.mockImplementation(async ({ data }: { data: { name: string } }) => ({ id: `m-${data.name}`, name: data.name }))
    prismaMock.merchant.findFirst.mockResolvedValue({ id: 'm-alt', name: 'Netflix' })
  })

  it('legt alle Einträge als wiederkehrend an, Händler neu oder vorhanden', async () => {
    const response = await bulk({
      items: [item, { merchantId: 'm-alt', merchant: 'Netflix', amount: -12.99, date: '2026-09-03', recurringInterval: 'monthly' }],
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ created: 2, salaryDay: null })
    const created = prismaMock.transaction.create.mock.calls.map((c) => c[0].data)
    expect(created[0]).toMatchObject({ merchant: 'Vermieter', merchantId: 'm-Vermieter', amount: -950, isRecurring: true, recurringInterval: 'monthly' })
    expect(created[1]).toMatchObject({ merchantId: 'm-alt', amount: -12.99 })
  })

  it('setzt auf Wunsch den Gehaltstag', async () => {
    const response = await bulk({ items: [item], salaryDay: 28 })
    expect(response.status).toBe(200)
    expect(prismaMock.account.update).toHaveBeenCalledWith({ where: { id: TEST_ACCOUNT.id }, data: { salaryDay: 28 } })
  })

  it('ein ungültiger Eintrag legt nichts an', async () => {
    const response = await bulk({ items: [item, { ...item, recurringInterval: 'weekly' }] })
    expect(response.status).toBe(400)
    expect(prismaMock.transaction.create).not.toHaveBeenCalled()
    expect(prismaMock.merchant.create).not.toHaveBeenCalled()
  })

  it('leere Auswahl und zu viele Einträge werden abgelehnt', async () => {
    expect((await bulk({ items: [] })).status).toBe(400)
    expect((await bulk({ items: Array.from({ length: 101 }, () => item) })).status).toBe(400)
  })

  it('auch mit „Start“ erlaubt, schreibgeschützt nicht', async () => {
    loginAs({ user: { ...BASIC, id: `user-basic-${ipCounter}` } })
    expect((await bulk({ items: [item] })).status).toBe(200)
    loginAs({ role: 'READ_ONLY', user: { id: `user-ro-${ipCounter}` } })
    expect((await bulk({ items: [item] })).status).toBe(403)
  })
})

describe('Import-Vorschau', () => {
  it('nennt die Zahl erkannter wiederkehrender Zahlungen', async () => {
    const response = await importPreviewRoute.POST(
      jsonRequest('POST', { csvText: dkbCsv(), formatId: 'dkbExport' }, 'http://localhost/api/transactions/import/preview')
    )
    expect(response.status).toBe(200)
    expect((await response.json()).recurringSuggestionCount).toBe(2)
  })
})
