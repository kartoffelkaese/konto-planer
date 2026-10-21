import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', async () => (await import('@/test/routeHarness')).prismaModule)
vi.mock('@/lib/auth', async () => (await import('@/test/routeHarness')).authModule)
vi.mock('@/lib/transfers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/transfers')>()),
  createTransferPair: vi.fn(async () => undefined),
}))

import {
  autoPendingUntil,
  createDuePendingInstances,
  openDueDates,
  type AutoPendingAccount,
} from '@/lib/recurringAutoPending'
import dayjs from 'dayjs'
import { berlinDayKey } from '@/lib/dateUtils'
import { createTransferPair } from '@/lib/transfers'
import { prismaMock, resetRouteMocks } from '@/test/routeHarness'

/** Kalendertag 0 Uhr Berlin – wie die Termine aus `getRecurringDueDatesInRange` */
const berlin = (iso: string) => dayjs.tz(iso, 'Europe/Berlin').toDate()
/** „Jetzt“: 10.10.2026 mittags */
const NOW = new Date('2026-10-10T12:00:00+02:00')

const account = (mode: AutoPendingAccount['recurringAutoMode'] = 'SALARY_MONTH'): AutoPendingAccount => ({
  id: 'account-1',
  name: 'Mein Konto',
  salaryDay: 1,
  isSimpleAccount: false,
  recurringAutoMode: mode,
  transferSenderName: null,
})

const template = (id: string, startIso: string, extra: Record<string, unknown> = {}) => ({
  id,
  accountId: 'account-1',
  date: berlin(startIso),
  recurringInterval: 'monthly',
  autoPendingUntil: null as Date | null,
  isRecurring: true,
  isRecurringPaused: false,
  parentTransactionId: null,
  merchant: id,
  merchantId: null,
  description: null,
  categoryId: null,
  amount: -10,
  isTransfer: false,
  transferTargetAccountId: null,
  ...extra,
})

/** Vorlagen und je Vorlage die Zahl ihrer Buchungen im Gehaltsmonat */
function givenTemplates(templates: ReturnType<typeof template>[], instanceCounts: Record<string, number> = {}) {
  prismaMock.transaction.findMany.mockResolvedValueOnce(templates)
  prismaMock.transaction.groupBy.mockResolvedValueOnce(
    Object.entries(instanceCounts).map(([parentTransactionId, _count]) => ({ parentTransactionId, _count }))
  )
}

const createdDays = () =>
  prismaMock.transaction.create.mock.calls.map((call) => berlinDayKey(call[0].data.date))

beforeEach(() => {
  resetRouteMocks()
  vi.mocked(createTransferPair).mockClear()
  prismaMock.transaction.updateMany.mockResolvedValue({ count: 1 })
  prismaMock.transaction.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
    id: `inst-${String(data.parentTransactionId)}-${berlinDayKey(data.date as Date)}`,
    ...data,
  }))
  prismaMock.transaction.findUniqueOrThrow.mockImplementation(async ({ where }: { where: { id: string } }) => ({
    id: where.id,
  }))
})

describe('openDueDates', () => {
  const quarter = { startDate: berlin('2026-10-01'), endDate: berlin('2026-12-31') }

  it('liefert nur Termine nach der Marke und bis zum Ende', () => {
    const t = { id: 't', date: berlin('2026-01-05'), recurringInterval: 'monthly', autoPendingUntil: berlin('2026-10-05') }
    expect(openDueDates(t, quarter, quarter.endDate).map(berlinDayKey)).toEqual(['2026-11-05', '2026-12-05'])
    expect(openDueDates(t, quarter, berlin('2026-11-30')).map(berlinDayKey)).toEqual(['2026-11-05'])
  })

  it('der Termin der Vorlage selbst ist keine offene Zahlung – sie ist die Buchung', () => {
    const t = { id: 't', date: berlin('2026-10-12'), recurringInterval: 'monthly', autoPendingUntil: null }
    expect(openDueDates(t, quarter, quarter.endDate).map(berlinDayKey)).toEqual(['2026-11-12', '2026-12-12'])
  })

  it('vorhandene Buchungen erledigen die ersten Termine – auch an einem anderen Tag', () => {
    const t = { id: 't', date: berlin('2026-01-05'), recurringInterval: 'monthly', autoPendingUntil: null }
    expect(openDueDates(t, quarter, quarter.endDate, 1).map(berlinDayKey)).toEqual(['2026-11-05', '2026-12-05'])
  })

  it('Modus bestimmt das Ende: Gehaltsmonat, heute oder gar nicht', () => {
    const month = { startDate: berlin('2026-10-01'), endDate: berlin('2026-10-31') }
    expect(autoPendingUntil('SALARY_MONTH', month, NOW)).toBe(month.endDate)
    expect(autoPendingUntil('ON_DUE_DATE', month, NOW)).toBe(NOW)
    expect(autoPendingUntil('OFF', month, NOW)).toBeNull()
  })
})

describe('createDuePendingInstances', () => {
  it('„Zu Beginn des Gehaltsmonats“: alle Termine des Monats, Marke auf den letzten', async () => {
    givenTemplates([template('miete', '2026-09-05'), template('strom', '2026-08-25')])
    const created = await createDuePendingInstances(account(), NOW)
    expect(created).toHaveLength(2)
    expect(createdDays()).toEqual(['2026-10-05', '2026-10-25'])
    expect(prismaMock.transaction.updateMany.mock.calls[1][0]).toMatchObject({
      where: { id: 'strom', OR: [{ autoPendingUntil: null }, { autoPendingUntil: { lt: berlin('2026-10-25') } }] },
      data: { autoPendingUntil: berlin('2026-10-25') },
    })
    expect(prismaMock.transaction.create.mock.calls[0][0].data).toMatchObject({
      parentTransactionId: 'miete',
      isConfirmed: false,
      isRecurring: false,
    })
  })

  it('„Am Buchungstag“: nur Termine bis heute', async () => {
    givenTemplates([template('miete', '2026-09-05'), template('strom', '2026-08-25')])
    await createDuePendingInstances(account('ON_DUE_DATE'), NOW)
    expect(createdDays()).toEqual(['2026-10-05'])
  })

  it('nie vor Beginn des Gehaltsmonats nachtragen', async () => {
    givenTemplates([template('alt', '2026-06-28')])
    await createDuePendingInstances(account(), NOW)
    expect(createdDays()).toEqual(['2026-10-28'])
  })

  it('Termin bis zur Marke (gelöscht oder zurückgenommen) kommt nicht wieder', async () => {
    givenTemplates([template('miete', '2026-09-05', { autoPendingUntil: berlin('2026-10-05') })])
    expect(await createDuePendingInstances(account(), NOW)).toEqual([])
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it('Buchung im Gehaltsmonat schon vorhanden (auch auf einen anderen Tag verschoben): nichts anlegen', async () => {
    givenTemplates([template('miete', '2026-09-05')], { miete: 1 })
    expect(await createDuePendingInstances(account(), NOW)).toEqual([])
    expect(prismaMock.transaction.create).not.toHaveBeenCalled()
  })

  it('Vorlage mit Datum im Gehaltsmonat: für ihren eigenen Termin keine zweite Buchung', async () => {
    givenTemplates([template('neu', '2026-10-08')])
    expect(await createDuePendingInstances(account(), NOW)).toEqual([])
    expect(prismaMock.transaction.create).not.toHaveBeenCalled()
  })

  it('hat ein anderer Lauf die Marke schon gesetzt, wird nichts angelegt', async () => {
    prismaMock.transaction.updateMany.mockResolvedValue({ count: 0 })
    givenTemplates([template('miete', '2026-09-05')])
    expect(await createDuePendingInstances(account(), NOW)).toEqual([])
    expect(prismaMock.transaction.create).not.toHaveBeenCalled()
  })

  it('Umbuchung: legt auch die Gegenbuchung an', async () => {
    givenTemplates([template('spar', '2026-09-05', { isTransfer: true, transferTargetAccountId: 'account-2' })])
    await createDuePendingInstances(account(), NOW)
    expect(createTransferPair).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'account-2', 'Mein Konto')
  })

  it('„Von Hand“ und einfache Konten: nichts', async () => {
    expect(await createDuePendingInstances(account('OFF'), NOW)).toEqual([])
    expect(await createDuePendingInstances({ ...account(), isSimpleAccount: true }, NOW)).toEqual([])
    expect(prismaMock.transaction.findMany).not.toHaveBeenCalled()
  })

  it('lädt nur aktive Vorlagen', async () => {
    givenTemplates([])
    await createDuePendingInstances(account(), NOW)
    expect(prismaMock.transaction.findMany.mock.calls[0][0].where).toMatchObject({
      isRecurring: true,
      isRecurringPaused: false,
      parentTransactionId: null,
    })
  })
})
