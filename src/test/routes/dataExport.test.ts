import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', async () => (await import('@/test/routeHarness')).prismaModule)
vi.mock('@/lib/auth', async () => (await import('@/test/routeHarness')).authModule)

import bcrypt from 'bcryptjs'
import { strFromU8, unzipSync } from 'fflate'
import * as exportRoute from '@/app/api/users/export/route'
import { collectUserData, OTHER_PERSON } from '@/lib/dataExport/collect'
import { buildExportFiles, csvCell, renderCsv, renderHtml } from '@/lib/dataExport/render'
import { jsonRequest, loginAs, prismaMock, resetRouteMocks, TEST_USER } from '@/test/routeHarness'

const PASSWORD = 'Richtig123'
const passwordHash = bcrypt.hashSync(PASSWORD, 4)
const decimal = (value: number) => ({ toNumber: () => value })

/** Ein Nutzer mit eigenem Konto, einem geteilten Konto und einer Split-Liste mit anderen */
function seedData() {
  const ownAccount = {
    id: 'acc-own',
    name: 'Girokonto',
    bankId: 'sparkasse',
    salaryDay: 1,
    isSimpleAccount: false,
    recurringAutoMode: 'SALARY_MONTH',
    transferSenderName: null,
    createdAt: new Date('2026-01-02'),
    _count: { members: 2 },
  }
  const sharedAccount = { ...ownAccount, id: 'acc-shared', name: 'Haushalt', _count: { members: 2 } }

  prismaMock.accountMember.findMany.mockResolvedValue([
    { role: 'OWNER', createdAt: new Date('2026-01-02'), account: ownAccount },
    { role: 'MEMBER', createdAt: new Date('2026-02-01'), account: sharedAccount },
  ])
  prismaMock.planChange.findMany.mockResolvedValue([
    {
      fromPlan: 'BASIC',
      toPlan: 'FULL',
      source: 'MANUAL',
      expiresAt: null,
      changedById: 'admin-9',
      note: 'Geschenk',
      createdAt: new Date('2026-03-01'),
    },
  ])
  prismaMock.accountInvite.findMany.mockImplementation(async (args: { where: { invitedByUserId?: string } }) =>
    args.where.invitedByUserId
      ? [{ role: 'MEMBER', status: 'ACCEPTED', createdAt: new Date('2026-01-05'), account: { name: 'Girokonto' } }]
      : []
  )
  prismaMock.splitListInvite.findMany.mockResolvedValue([])
  prismaMock.splitListMember.findMany.mockResolvedValue([
    {
      role: 'MEMBER',
      createdAt: new Date('2026-04-01'),
      splitList: {
        id: 'list-1',
        name: 'Urlaub',
        description: null,
        status: 'ACTIVE',
        shareEnabled: true,
        currencies: [],
      },
    },
  ])

  // Konto: Nachschlagetabelle und Buchungen
  prismaMock.category.findMany.mockResolvedValue([{ id: 'cat-1', name: 'Lebensmittel', color: '#00aa00' }])
  prismaMock.merchant.findMany.mockResolvedValue([{ id: 'm-1', name: 'REWE' }])
  prismaMock.merchantCategory.findMany.mockResolvedValue([{ merchantId: 'm-1', categoryId: 'cat-1' }])
  prismaMock.transaction.findMany.mockResolvedValue([
    {
      date: new Date('2026-05-03'),
      merchant: 'rewe markt',
      merchantId: 'm-1',
      categoryId: null,
      description: '<script>alert(1)</script>',
      amount: decimal(-42.5),
      isConfirmed: true,
      isRecurring: false,
      isRecurringPaused: false,
      recurringInterval: null,
      parentTransactionId: null,
      isTransfer: false,
      transferTargetMerchant: null,
      createdAt: new Date('2026-05-03'),
    },
  ])

  // Split: du (p-me), Anna (p-anna), Ben (p-ben)
  prismaMock.splitParticipant.findMany.mockImplementation(async (args: { where: { userId?: string } }) =>
    args.where.userId
      ? [{ id: 'p-me', displayName: 'Ich' }]
      : [{ id: 'p-me' }, { id: 'p-anna' }, { id: 'p-ben' }]
  )
  prismaMock.splitExpense.findMany.mockResolvedValue([
    // Anna zahlt 10 € für alle drei → dein Anteil 3,33 € (Rundungsrest beim letzten)
    {
      date: new Date('2026-06-01'),
      description: 'Pizza',
      amount: decimal(10),
      originalAmount: null,
      originalCurrencyCode: null,
      exchangeRate: null,
      paidByParticipantId: 'p-anna',
      category: null,
      shares: [],
    },
    // Anna zahlt nur für Ben → nicht dabei
    {
      date: new Date('2026-06-02'),
      description: 'Geschenk für Ben',
      amount: decimal(20),
      originalAmount: null,
      originalCurrencyCode: null,
      exchangeRate: null,
      paidByParticipantId: 'p-anna',
      category: null,
      shares: [{ participantId: 'p-ben' }],
    },
    // Du zahlst für Ben → dabei, Anteil 0
    {
      date: new Date('2026-06-03'),
      description: 'Taxi',
      amount: decimal(9),
      originalAmount: null,
      originalCurrencyCode: null,
      exchangeRate: null,
      paidByParticipantId: 'p-me',
      category: { name: 'Transport' },
      shares: [{ participantId: 'p-ben' }],
    },
  ])
  prismaMock.splitSettlement.findMany.mockResolvedValue([
    { settledAt: new Date('2026-07-01'), fromParticipantId: 'p-me', toParticipantId: 'p-anna', amount: decimal(3.33), note: null },
    { settledAt: new Date('2026-07-02'), fromParticipantId: 'p-ben', toParticipantId: 'p-anna', amount: decimal(20), note: null },
  ])
}

const user = { ...TEST_USER, passwordHash, stripeCustomerId: 'cus_geheim' }

beforeEach(() => {
  resetRouteMocks()
  seedData()
})

describe('Daten sammeln', () => {
  it('eigene Konten vollständig, geteilte nur als Mitgliedschaft', async () => {
    const data = await collectUserData(user as never)
    expect(data.ownAccounts).toHaveLength(1)
    expect(data.ownAccounts[0]).toMatchObject({ name: 'Girokonto', bank: 'Sparkasse', otherMembers: 1 })
    expect(data.ownAccounts[0].transactions[0]).toMatchObject({
      merchant: 'REWE',
      category: 'Lebensmittel',
      amount: -42.5,
    })
    expect(data.sharedAccounts).toEqual([
      { name: 'Haushalt', role: 'Mitglied', memberSince: '2026-02-01T00:00:00.000Z' },
    ])
    // Buchungen nur für das eigene Konto geladen
    expect(prismaMock.transaction.findMany).toHaveBeenCalledTimes(1)
    expect(prismaMock.transaction.findMany.mock.calls[0][0].where).toEqual({ accountId: 'acc-own' })
  })

  it('Split: nur beteiligte Ausgaben und Ausgleiche, andere ohne Namen', async () => {
    const data = await collectUserData(user as never)
    const list = data.splitLists[0]
    expect(list.yourName).toBe('Ich')
    expect(list.publicLinkActive).toBeNull()
    expect(list.expenses.map((e) => e.description)).toEqual(['Pizza', 'Taxi'])
    expect(list.expenses[0]).toMatchObject({ paidBy: OTHER_PERSON, participants: 3, yourShare: 3.33 })
    expect(list.expenses[1]).toMatchObject({ paidBy: 'du', yourShare: 0 })
    expect(list.settlements).toEqual([
      { list: 'Urlaub', date: '2026-07-01T00:00:00.000Z', from: 'du', to: OTHER_PERSON, amount: 3.33, note: null },
    ])
  })

  it('keine fremden Namen, Adressen, Hashes oder IDs', async () => {
    const data = await collectUserData(user as never)
    const json = JSON.stringify(data)
    expect(data.planChanges[0].changedBy).toBe('Verwaltung')
    expect(data.plan.stripeCustomer).toBe(true)
    for (const secret of ['Anna"', 'Ben"', 'admin-9', 'cus_geheim', passwordHash, 'p-anna', 'acc-own', 'm-1']) {
      expect(json).not.toContain(secret)
    }
  })
})

describe('Ausgabe', () => {
  it('CSV: Semikolon, Anführungszeichen, Formelschutz, Dezimalkomma', () => {
    expect(csvCell('a;b "c"')).toBe('"a;b ""c"""')
    expect(csvCell('=SUMME(A1)')).toBe(`"'=SUMME(A1)"`)
    expect(csvCell('-1')).toBe(`"'-1"`)
    expect(csvCell(-42.5)).toBe('-42,5')
    expect(csvCell(true)).toBe('ja')
    expect(csvCell(null)).toBe('')
    const csv = renderCsv([{ a: 1 }], [{ header: 'A', value: (r) => r.a }])
    expect(csv.startsWith('﻿"A"\r\n1')).toBe(true)
  })

  it('HTML maskiert Eingaben und verweist auf die Datenschutzerklärung', async () => {
    const data = await collectUserData(user as never)
    const html = renderHtml(data, { privacyUrl: 'https://example.test/datenschutz' })
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('https://example.test/datenschutz')
    expect(renderHtml(data, { privacyUrl: null })).not.toContain('Datenschutzerklärung</a>')
  })

  it('Dateien im Export', async () => {
    const data = await collectUserData(user as never)
    expect(Object.keys(buildExportFiles(data, { privacyUrl: null })).sort()).toEqual([
      'Uebersicht.html',
      'csv/benutzer.csv',
      'csv/einladungen.csv',
      'csv/geteilte-konten.csv',
      'csv/konto-girokonto-buchungen.csv',
      'csv/konto-girokonto-haendler.csv',
      'csv/konto-girokonto-kategorien.csv',
      'csv/level-verlauf.csv',
      'csv/split-ausgaben.csv',
      'csv/split-ausgleiche.csv',
      'csv/split-listen.csv',
      'daten.json',
    ])
  })
})

describe('POST /api/users/export', () => {
  const post = (body?: unknown) => exportRoute.POST(jsonRequest('POST', body, 'http://localhost/api/users/export'))

  it('ohne Sitzung: 401', async () => {
    expect((await post({ password: PASSWORD })).status).toBe(401)
  })

  it('ohne oder mit falschem Passwort: 400, nichts wird gesammelt', async () => {
    loginAs({ user: { id: 'user-pw', passwordHash } })
    expect((await post({})).status).toBe(400)
    const wrong = await post({ password: 'falsch' })
    expect(wrong.status).toBe(400)
    expect((await wrong.json()).error).toBe('Falsches Passwort')
    expect(prismaMock.accountMember.findMany).not.toHaveBeenCalled()
  })

  it('liefert eine ZIP-Datei mit Übersicht, CSV und JSON', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {})
    loginAs({ user: { id: 'user-ok', passwordHash } })
    const response = await post({ password: PASSWORD })
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/zip')
    expect(response.headers.get('content-disposition')).toMatch(/attachment; filename="kontoplaner-daten-\d{4}-\d{2}-\d{2}\.zip"/)
    expect(response.headers.get('cache-control')).toBe('no-store')

    const files = unzipSync(new Uint8Array(await response.arrayBuffer()))
    expect(Object.keys(files)).toContain('Uebersicht.html')
    expect(JSON.parse(strFromU8(files['daten.json'])).user.email).toBe(TEST_USER.email)
  })

  it('höchstens 5 Versuche pro Stunde', async () => {
    loginAs({ user: { id: 'user-limit', passwordHash } })
    for (let i = 0; i < 5; i++) {
      expect((await post({ password: 'falsch' })).status).toBe(400)
    }
    expect((await post({ password: PASSWORD })).status).toBe(429)
  })
})
