import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', async () => (await import('@/test/routeHarness')).prismaModule)

const stripeMock = vi.hoisted(() => ({
  subscriptions: { list: vi.fn() },
  customers: { create: vi.fn(), retrieve: vi.fn() },
}))
vi.mock('@/lib/stripe', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/stripe')>()),
  getStripe: () => stripeMock,
}))

import {
  BILLING_GRACE_DAYS,
  billingStateFromSubscription,
  canBillingSetPlan,
  ensureStripeCustomer,
  pickSubscription,
  syncCustomer,
  type SubscriptionSnapshot,
} from './billing'
import { prismaMock, resetRouteMocks } from '@/test/routeHarness'

const NOW = new Date('2026-10-13T12:00:00Z')
const PERIOD_END = new Date('2026-11-13T12:00:00Z')
const DAY = 24 * 60 * 60 * 1000

const snapshot = (overrides: Partial<SubscriptionSnapshot> = {}): SubscriptionSnapshot => ({
  id: 'sub_1',
  status: 'active',
  periodEnd: PERIOD_END,
  cancelAtPeriodEnd: false,
  endedAt: null,
  priceId: 'price_year',
  ...overrides,
})

beforeEach(() => {
  resetRouteMocks()
  stripeMock.subscriptions.list.mockReset()
  stripeMock.customers.create.mockReset()
  stripeMock.customers.retrieve.mockReset()
  stripeMock.customers.retrieve.mockResolvedValue({ id: 'cus_1' })
  vi.stubEnv('STRIPE_PRICE_MONTHLY', 'price_month')
  vi.stubEnv('STRIPE_PRICE_YEARLY', 'price_year')
})

afterEach(() => vi.unstubAllEnvs())

describe('billingStateFromSubscription', () => {
  it('laufendes Abo: „Komplett“ bis Periodenende plus Kulanz', () => {
    const state = billingStateFromSubscription(snapshot(), NOW)
    expect(state).toMatchObject({ subscriptionId: 'sub_1', status: 'active', interval: 'YEARLY' })
    expect(state.plan).toEqual({
      plan: 'FULL',
      expiresAt: new Date(PERIOD_END.getTime() + BILLING_GRACE_DAYS * DAY),
    })
  })

  it('im Verzug und im Stripe-Testzeitraum gilt weiter „Komplett“', () => {
    for (const status of ['past_due', 'trialing']) {
      expect(billingStateFromSubscription(snapshot({ status }), NOW).plan?.expiresAt.getTime()).toBeGreaterThan(
        PERIOD_END.getTime()
      )
    }
  })

  it('zum Periodenende gekündigt: endet genau dort, ohne Kulanz', () => {
    const state = billingStateFromSubscription(snapshot({ cancelAtPeriodEnd: true }), NOW)
    expect(state.cancelAtPeriodEnd).toBe(true)
    expect(state.plan?.expiresAt).toEqual(PERIOD_END)
  })

  it('beendetes Abo: „Komplett“ ist abgelaufen', () => {
    const endedAt = new Date('2026-10-01T00:00:00Z')
    for (const status of ['canceled', 'unpaid', 'paused', 'incomplete_expired']) {
      const state = billingStateFromSubscription(snapshot({ status, endedAt, cancelAtPeriodEnd: true }), NOW)
      expect(state.plan?.expiresAt).toEqual(endedAt)
      expect(state.cancelAtPeriodEnd).toBe(false)
    }
  })

  it('erste Zahlung noch offen: keine Aussage zum Level', () => {
    expect(billingStateFromSubscription(snapshot({ status: 'incomplete' }), NOW).plan).toBeNull()
  })

  it('kein Abo: nichts läuft', () => {
    expect(billingStateFromSubscription(null, NOW)).toMatchObject({
      subscriptionId: null,
      status: null,
      interval: null,
      plan: { plan: 'FULL', expiresAt: NOW },
    })
  })
})

describe('pickSubscription', () => {
  it('nimmt ein laufendes Abo vor einem neueren beendeten', () => {
    const picked = pickSubscription([
      { status: 'canceled', created: 300 },
      { status: 'active', created: 200 },
      { status: 'canceled', created: 100 },
    ])
    expect(picked).toEqual({ status: 'active', created: 200 })
  })

  it('sonst das jüngste, ohne Abos nichts', () => {
    expect(pickSubscription([{ status: 'canceled', created: 1 }, { status: 'unpaid', created: 2 }])?.created).toBe(2)
    expect(pickSubscription([])).toBeNull()
  })
})

describe('canBillingSetPlan', () => {
  it('überschreibt nie ein geltendes, von Hand oder als Bestand vergebenes „Komplett“', () => {
    expect(canBillingSetPlan({ plan: 'FULL', planSource: 'LEGACY', planExpiresAt: null }, NOW)).toBe(false)
    expect(canBillingSetPlan({ plan: 'FULL', planSource: 'MANUAL', planExpiresAt: PERIOD_END }, NOW)).toBe(false)
  })

  it('darf setzen bei „Start“, Testphase, Stripe und abgelaufener Hand-Vergabe', () => {
    expect(canBillingSetPlan({ plan: 'BASIC', planSource: 'MANUAL', planExpiresAt: null }, NOW)).toBe(true)
    expect(canBillingSetPlan({ plan: 'BASIC', planSource: null, planExpiresAt: null }, NOW)).toBe(true)
    expect(canBillingSetPlan({ plan: 'FULL', planSource: 'TRIAL', planExpiresAt: PERIOD_END }, NOW)).toBe(true)
    expect(canBillingSetPlan({ plan: 'FULL', planSource: 'STRIPE', planExpiresAt: PERIOD_END }, NOW)).toBe(true)
    expect(
      canBillingSetPlan({ plan: 'FULL', planSource: 'MANUAL', planExpiresAt: new Date('2026-01-01') }, NOW)
    ).toBe(true)
  })
})

describe('syncCustomer', () => {
  const stripeSubscription = (overrides: Record<string, unknown> = {}) => ({
    id: 'sub_1',
    status: 'active',
    created: 100,
    cancel_at_period_end: false,
    cancel_at: null,
    ended_at: null,
    trial_end: null,
    items: {
      data: [{ current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400, price: { id: 'price_month' } }],
    },
    ...overrides,
  })
  const listReturns = (...subscriptions: unknown[]) =>
    stripeMock.subscriptions.list.mockResolvedValue({ data: subscriptions })

  it('unbekannter Kunde: nichts passiert', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)
    expect(await syncCustomer('cus_x')).toBe('unknown-customer')
    expect(stripeMock.subscriptions.list).not.toHaveBeenCalled()
  })

  it('Nutzer zwischendurch gelöscht (Abo-Ende beim Löschen): kein Fehler', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', plan: 'FULL', planSource: 'STRIPE', planExpiresAt: null })
    listReturns(stripeSubscription({ status: 'canceled', ended_at: 100 }))
    prismaMock.user.update.mockRejectedValue(Object.assign(new Error('No record was found for an update.'), { code: 'P2025' }))
    expect(await syncCustomer('cus_1')).toBe('unknown-customer')
  })

  it('andere Datenbankfehler werden weitergereicht (Stripe stellt erneut zu)', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', plan: 'BASIC', planSource: null, planExpiresAt: null })
    listReturns(stripeSubscription())
    prismaMock.user.update.mockRejectedValue(new Error('Verbindung verloren'))
    await expect(syncCustomer('cus_1')).rejects.toThrow('Verbindung verloren')
  })

  it('neues Abo: setzt „Komplett“ aus Stripe und protokolliert den Wechsel', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', plan: 'BASIC', planSource: null, planExpiresAt: null })
    listReturns(stripeSubscription())

    expect(await syncCustomer('cus_1')).toBe('updated')
    const { data } = prismaMock.user.update.mock.calls[0][0]
    expect(data).toMatchObject({
      stripeSubscriptionId: 'sub_1',
      stripeSubscriptionStatus: 'active',
      planInterval: 'MONTHLY',
      planCancelAtPeriodEnd: false,
      plan: 'FULL',
      planSource: 'STRIPE',
    })
    expect(data.planExpiresAt.getTime()).toBeGreaterThan(Date.now() + 30 * DAY)
    expect(prismaMock.planChange.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: 'u1', fromPlan: 'BASIC', toPlan: 'FULL', source: 'STRIPE' }),
    })
  })

  it('Verlängerung: Level bleibt „Komplett“, kein neuer Protokolleintrag', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      plan: 'FULL',
      planSource: 'STRIPE',
      planExpiresAt: new Date(Date.now() + DAY),
    })
    listReturns(stripeSubscription())
    await syncCustomer('cus_1')
    expect(prismaMock.user.update.mock.calls[0][0].data.plan).toBe('FULL')
    expect(prismaMock.planChange.create).not.toHaveBeenCalled()
  })

  it('beendetes Abo: „Komplett“ läuft ab und der Wechsel auf „Start“ wird protokolliert', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      plan: 'FULL',
      planSource: 'STRIPE',
      planExpiresAt: new Date(Date.now() + 10 * DAY),
    })
    listReturns(stripeSubscription({ status: 'canceled', ended_at: Math.floor(Date.now() / 1000) - 60 }))
    await syncCustomer('cus_1')
    const { data } = prismaMock.user.update.mock.calls[0][0]
    expect(data.planExpiresAt.getTime()).toBeLessThan(Date.now())
    expect(prismaMock.planChange.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ fromPlan: 'FULL', toPlan: 'BASIC', source: 'STRIPE', expiresAt: null }),
    })
  })

  it('Bestand bleibt unangetastet – nur die Abo-Angaben werden vermerkt', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', plan: 'FULL', planSource: 'LEGACY', planExpiresAt: null })
    listReturns(stripeSubscription({ status: 'canceled', ended_at: 1 }))
    await syncCustomer('cus_1')
    const { data } = prismaMock.user.update.mock.calls[0][0]
    expect(data).not.toHaveProperty('plan')
    expect(data).not.toHaveProperty('planSource')
    expect(data.stripeSubscriptionStatus).toBe('canceled')
    expect(prismaMock.planChange.create).not.toHaveBeenCalled()
  })

  it('Kunde ohne Abo, Level nicht aus Stripe: Testphase bleibt bestehen', async () => {
    const trialEnd = new Date(Date.now() + 5 * DAY)
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', plan: 'FULL', planSource: 'TRIAL', planExpiresAt: trialEnd })
    listReturns()
    await syncCustomer('cus_1')
    expect(prismaMock.user.update.mock.calls[0][0].data).not.toHaveProperty('plan')
  })
})

describe('ensureStripeCustomer', () => {
  it('legt den Kunden nur einmal an', async () => {
    expect(await ensureStripeCustomer({ id: 'u1', email: 'a@b.de', stripeCustomerId: 'cus_1' })).toBe('cus_1')
    expect(stripeMock.customers.create).not.toHaveBeenCalled()

    stripeMock.customers.create.mockResolvedValue({ id: 'cus_2' })
    expect(await ensureStripeCustomer({ id: 'u1', email: 'a@b.de', stripeCustomerId: null })).toBe('cus_2')
    expect(stripeMock.customers.create).toHaveBeenCalledWith({ email: 'a@b.de', metadata: { userId: 'u1' } })
    expect(prismaMock.user.update.mock.calls[0][0]).toMatchObject({ where: { id: 'u1' }, data: { stripeCustomerId: 'cus_2' } })
  })

  it.each([
    ['gelöscht', () => stripeMock.customers.retrieve.mockResolvedValue({ id: 'cus_1', deleted: true })],
    ['unbekannt', () => stripeMock.customers.retrieve.mockRejectedValue(Object.assign(new Error('x'), { code: 'resource_missing' }))],
  ])('Kunde bei Stripe %s: legt einen neuen an und löst den alten Abo-Stand', async (_name, setup) => {
    setup()
    stripeMock.customers.create.mockResolvedValue({ id: 'cus_neu' })
    expect(await ensureStripeCustomer({ id: 'u1', email: 'a@b.de', stripeCustomerId: 'cus_1' })).toBe('cus_neu')
    expect(prismaMock.user.update.mock.calls[0][0].data).toMatchObject({
      stripeCustomerId: 'cus_neu',
      stripeSubscriptionId: null,
      stripeSubscriptionStatus: null,
    })
  })

  it('andere Stripe-Fehler brechen ab, statt einen zweiten Kunden anzulegen', async () => {
    stripeMock.customers.retrieve.mockRejectedValue(new Error('Netzwerk'))
    await expect(ensureStripeCustomer({ id: 'u1', email: 'a@b.de', stripeCustomerId: 'cus_1' })).rejects.toThrow('Netzwerk')
    expect(stripeMock.customers.create).not.toHaveBeenCalled()
  })
})

describe('Abo beim Löschen beenden', () => {
  it('beendet nur laufende Abos, sofort', async () => {
    const { cancelSubscriptionsNow } = await import('./billing')
    const cancel = vi.fn().mockResolvedValue({})
    Object.assign(stripeMock.subscriptions, { cancel })
    stripeMock.subscriptions.list.mockResolvedValue({
      data: [
        { id: 'sub_alt', status: 'canceled' },
        { id: 'sub_aktiv', status: 'active' },
        { id: 'sub_verzug', status: 'past_due' },
      ],
    })
    await cancelSubscriptionsNow('cus_1')
    expect(cancel.mock.calls.map((call) => call[0])).toEqual(['sub_aktiv', 'sub_verzug'])
  })

  it('deleteUserWithData löscht nicht, wenn das Abo nicht beendet werden kann', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_x')
    const { deleteUserWithData } = await import('./userDelete')
    prismaMock.user.findUnique.mockResolvedValue({ stripeCustomerId: 'cus_1' })
    stripeMock.subscriptions.list.mockRejectedValue(new Error('Stripe nicht erreichbar'))

    await expect(deleteUserWithData('u1')).rejects.toThrow('Stripe nicht erreichbar')
    expect(prismaMock.user.delete).not.toHaveBeenCalled()
  })

  it('deleteUserWithData beendet das Abo und löscht dann', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_x')
    const { deleteUserWithData } = await import('./userDelete')
    const cancel = vi.fn().mockResolvedValue({})
    Object.assign(stripeMock.subscriptions, { cancel })
    prismaMock.user.findUnique.mockResolvedValue({ stripeCustomerId: 'cus_1' })
    stripeMock.subscriptions.list.mockResolvedValue({ data: [{ id: 'sub_1', status: 'active' }] })
    prismaMock.accountMember.findMany.mockResolvedValue([])

    await deleteUserWithData('u1')
    expect(cancel).toHaveBeenCalledWith('sub_1')
    expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: 'u1' } })
  })
})
