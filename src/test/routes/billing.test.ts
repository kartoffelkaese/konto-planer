import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', async () => (await import('@/test/routeHarness')).prismaModule)
vi.mock('@/lib/auth', async () => (await import('@/test/routeHarness')).authModule)

const stripeMock = vi.hoisted(() => ({
  checkout: { sessions: { create: vi.fn() } },
  billingPortal: { sessions: { create: vi.fn() } },
  customers: { create: vi.fn() },
  subscriptions: { list: vi.fn() },
}))
vi.mock('@/lib/stripe', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/stripe')>()),
  getStripe: () => stripeMock,
}))

// E-Mails werden nicht wirklich verschickt
const sendMail = vi.hoisted(() => vi.fn())
vi.mock('@/lib/email', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/email')>()),
  sendEmail: sendMail,
}))

// Arbeit nach der Antwort (`after`) wird gesammelt und im Test von Hand ausgeführt
const afterCallbacks = vi.hoisted(() => [] as Array<() => unknown>)
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: (callback: () => unknown) => {
    afterCallbacks.push(callback)
  },
}))
async function runAfter() {
  for (const callback of afterCallbacks.splice(0)) await callback()
}

import { createHash } from 'node:crypto'
import { NextRequest } from 'next/server'
import * as checkoutRoute from '@/app/api/billing/checkout/route'
import * as portalRoute from '@/app/api/billing/portal/route'
import * as syncRoute from '@/app/api/billing/sync/route'
import { jsonRequest, loginAs, prismaMock, resetRouteMocks } from '@/test/routeHarness'

const BASIC = { plan: 'BASIC' as const, planSource: null }
const DAY = 24 * 60 * 60 * 1000

const checkout = (body: unknown) =>
  checkoutRoute.POST(new NextRequest(jsonRequest('POST', body, 'http://localhost/api/billing/checkout')))

beforeEach(() => {
  resetRouteMocks()
  for (const fn of [
    stripeMock.checkout.sessions.create,
    stripeMock.billingPortal.sessions.create,
    stripeMock.customers.create,
    stripeMock.subscriptions.list,
  ]) {
    fn.mockReset()
  }
  stripeMock.checkout.sessions.create.mockResolvedValue({ url: 'https://checkout.stripe.test/s1' })
  stripeMock.customers.create.mockResolvedValue({ id: 'cus_neu' })
  vi.stubEnv('PLANS_ENABLED', 'true')
  vi.stubEnv('AUTH_URL', 'https://app.test')
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_x')
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_x')
  vi.stubEnv('STRIPE_PRICE_MONTHLY', 'price_month')
  vi.stubEnv('STRIPE_PRICE_YEARLY', 'price_year')
})

afterEach(() => vi.unstubAllEnvs())

describe('Kauf starten', () => {
  it('ohne Stripe-Einrichtung gibt es die Routen nicht (404)', async () => {
    vi.stubEnv('STRIPE_PRICE_YEARLY', '')
    loginAs({ user: BASIC })
    expect((await checkout({ interval: 'YEARLY' })).status).toBe(404)
    expect((await portalRoute.POST()).status).toBe(404)
    expect((await syncRoute.POST()).status).toBe(404)
  })

  it('ohne Anmeldung: 401', async () => {
    expect((await checkout({ interval: 'YEARLY' })).status).toBe(401)
  })

  it('verlangt ein gültiges Intervall', async () => {
    loginAs({ user: BASIC })
    expect((await checkout({ interval: 'WEEKLY' })).status).toBe(400)
    expect(stripeMock.checkout.sessions.create).not.toHaveBeenCalled()
  })

  it('legt den Kunden an und liefert die Adresse der Bezahlseite', async () => {
    loginAs({ user: BASIC })
    const response = await checkout({ interval: 'YEARLY' })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ url: 'https://checkout.stripe.test/s1' })

    const params = stripeMock.checkout.sessions.create.mock.calls[0][0]
    expect(params).toMatchObject({
      mode: 'subscription',
      customer: 'cus_neu',
      line_items: [{ price: 'price_year', quantity: 1 }],
      locale: 'de',
      allow_promotion_codes: true,
      success_url: 'https://app.test/settings?billing=success#plan',
    })
    expect(params.subscription_data).not.toHaveProperty('trial_end')
    expect(params).not.toHaveProperty('consent_collection')
  })

  it('Kauf in der Testphase: das Abo beginnt erst mit ihrem Ende', async () => {
    const trialEnd = new Date(Date.now() + 10 * DAY)
    loginAs({ user: { plan: 'FULL', planSource: 'TRIAL', planExpiresAt: trialEnd, stripeCustomerId: 'cus_1' } })
    await checkout({ interval: 'MONTHLY' })
    const params = stripeMock.checkout.sessions.create.mock.calls[0][0]
    expect(params.customer).toBe('cus_1')
    expect(params.line_items[0].price).toBe('price_month')
    expect(params.subscription_data.trial_end).toBe(Math.floor(trialEnd.getTime() / 1000))
    expect(stripeMock.customers.create).not.toHaveBeenCalled()
  })

  it('weniger als zwei Tage Testphase übrig: das Abo beginnt sofort', async () => {
    loginAs({ user: { plan: 'FULL', planSource: 'TRIAL', planExpiresAt: new Date(Date.now() + DAY) } })
    await checkout({ interval: 'MONTHLY' })
    expect(stripeMock.checkout.sessions.create.mock.calls[0][0].subscription_data).not.toHaveProperty('trial_end')
  })

  it('kein Kauf bei dauerhaftem „Komplett“ oder laufendem Abo', async () => {
    loginAs()
    expect((await checkout({ interval: 'YEARLY' })).status).toBe(400)

    loginAs({ user: { ...BASIC, stripeSubscriptionStatus: 'active', planSource: 'STRIPE' } })
    expect((await checkout({ interval: 'YEARLY' })).status).toBe(409)
    expect(stripeMock.checkout.sessions.create).not.toHaveBeenCalled()
  })

  it('verlangt auf Wunsch die Zustimmung zu den AGB', async () => {
    vi.stubEnv('STRIPE_TOS_CONSENT', 'true')
    loginAs({ user: BASIC })
    await checkout({ interval: 'YEARLY' })
    expect(stripeMock.checkout.sessions.create.mock.calls[0][0].consent_collection).toEqual({
      terms_of_service: 'required',
    })
  })
})

describe('Abo verwalten und abgleichen', () => {
  it('Portal nur mit vorhandenem Stripe-Kunden', async () => {
    loginAs({ user: BASIC })
    expect((await portalRoute.POST()).status).toBe(400)

    vi.stubEnv('STRIPE_PORTAL_CONFIGURATION', 'bpc_1')
    stripeMock.billingPortal.sessions.create.mockResolvedValue({ url: 'https://portal.stripe.test/p1' })
    loginAs({ user: { ...BASIC, stripeCustomerId: 'cus_1' } })
    const response = await portalRoute.POST()
    expect(await response.json()).toEqual({ url: 'https://portal.stripe.test/p1' })
    expect(stripeMock.billingPortal.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_1', configuration: 'bpc_1' })
    )
  })

  it('Abgleich holt den Stand des eigenen Kunden', async () => {
    loginAs({ user: BASIC })
    expect(await (await syncRoute.POST()).json()).toEqual({ synced: false })
    expect(stripeMock.subscriptions.list).not.toHaveBeenCalled()

    stripeMock.subscriptions.list.mockResolvedValue({ data: [] })
    loginAs({ user: { ...BASIC, stripeCustomerId: 'cus_1' } })
    expect(await (await syncRoute.POST()).json()).toEqual({ synced: true })
    expect(stripeMock.subscriptions.list).toHaveBeenCalledWith(expect.objectContaining({ customer: 'cus_1' }))
    expect(prismaMock.user.update).toHaveBeenCalled()
  })
})

describe('Kündigen', () => {
  beforeEach(() => {
    sendMail.mockReset()
    sendMail.mockResolvedValue(undefined)
  })

  const periodEnd = Math.floor(Date.now() / 1000) + 20 * 86400
  const running = {
    id: 'sub_1',
    status: 'active',
    created: 1,
    cancel_at_period_end: false,
    cancel_at: null,
    ended_at: null,
    trial_end: null,
    items: { data: [{ current_period_end: periodEnd, price: { id: 'price_month' } }] },
  }

  it('angemeldet: kündigt zum Periodenende, gleicht ab und bestätigt per E-Mail', async () => {
    const cancelRoute = await import('@/app/api/billing/cancel/route')
    const subscriptionsUpdate = vi.fn().mockResolvedValue({ ...running, cancel_at_period_end: true })
    Object.assign(stripeMock.subscriptions, { update: subscriptionsUpdate })
    stripeMock.subscriptions.list.mockResolvedValue({ data: [running] })
    loginAs({ user: { ...BASIC, stripeCustomerId: 'cus_1', stripeSubscriptionStatus: 'active' } })

    const response = await cancelRoute.POST()
    expect(response.status).toBe(200)
    expect((await response.json()).endsAt).toBe(new Date(periodEnd * 1000).toISOString())
    expect(subscriptionsUpdate).toHaveBeenCalledWith('sub_1', { cancel_at_period_end: true })
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'nutzer@beispiel.de', subject: expect.stringContaining('Kündigung') })
    )
  })

  it('angemeldet ohne laufendes Abo: 400, keine E-Mail', async () => {
    const cancelRoute = await import('@/app/api/billing/cancel/route')
    stripeMock.subscriptions.list.mockResolvedValue({ data: [] })
    loginAs({ user: { ...BASIC, stripeCustomerId: 'cus_1' } })
    expect((await cancelRoute.POST()).status).toBe(400)
    loginAs({ user: BASIC })
    expect((await cancelRoute.POST()).status).toBe(400)
    expect(sendMail).not.toHaveBeenCalled()
  })

  describe('ohne Anmeldung, über einen Link an die Adresse', () => {
    // Jede Anfrage von einer eigenen IP, damit das Rate-Limit die Tests nicht gegenseitig beeinflusst
    let ipCounter = 0
    const requestCancellation = async (body: unknown) => {
      const route = await import('@/app/api/billing/cancel-request/route')
      const request = jsonRequest('POST', body, 'http://localhost/api/billing/cancel-request')
      request.headers.set('x-real-ip', `10.0.0.${++ipCounter}`)
      return route.POST(new NextRequest(request))
    }
    const confirm = async (body: unknown) => {
      const route = await import('@/app/api/billing/cancel-confirm/route')
      return route.POST(new NextRequest(jsonRequest('POST', body, 'http://localhost/api/billing/cancel-confirm')))
    }
    const tokenRecord = (overrides: Record<string, unknown> = {}) => ({
      id: 'tok_1',
      userId: 'user-2',
      purpose: 'CANCEL_SUBSCRIPTION',
      expiresAt: new Date(Date.now() + 60_000),
      ...overrides,
    })

    beforeEach(() => {
      afterCallbacks.length = 0
      vi.stubEnv('TRUST_PROXY', 'true')
    })

    it('ungültige Adresse: 400', async () => {
      expect((await requestCancellation({ email: 'kein-at' })).status).toBe(400)
    })

    it('antwortet immer gleich – ohne Abo wird nichts verschickt', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null)
      const unknown = await requestCancellation({ email: 'fremd@beispiel.de' })
      prismaMock.user.findUnique.mockResolvedValue({ id: 'user-2', email: 'anna@beispiel.de', stripeSubscriptionStatus: 'canceled' })
      const withoutSubscription = await requestCancellation({ email: 'anna@beispiel.de' })
      await runAfter()

      expect(await unknown.json()).toEqual({ received: true })
      expect(await withoutSubscription.json()).toEqual({ received: true })
      expect(sendMail).not.toHaveBeenCalled()
      expect(prismaMock.emailVerificationToken.create).not.toHaveBeenCalled()
    })

    it('mit laufendem Abo: Link zur Bestätigung an genau diese Adresse, gekündigt wird noch nicht', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'user-2', email: 'anna@beispiel.de', stripeSubscriptionStatus: 'active' })
      const update = vi.fn()
      Object.assign(stripeMock.subscriptions, { update })

      const response = await requestCancellation({ email: ' Anna@Beispiel.de ' })
      expect(await response.json()).toEqual({ received: true })
      await runAfter()

      expect(prismaMock.emailVerificationToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: 'user-2', purpose: 'CANCEL_SUBSCRIPTION' }),
      })
      expect(sendMail).toHaveBeenCalledTimes(1)
      const mail = sendMail.mock.calls[0][0]
      expect(mail.to).toBe('anna@beispiel.de')
      expect(mail.text).toMatch(/https:\/\/app\.test\/kuendigen\/bestaetigen\?token=[0-9a-f]{64}/)
      expect(update).not.toHaveBeenCalled()
    })

    it('Bestätigung mit gültigem Link: kündigt zum Periodenende, Link gilt nur einmal', async () => {
      const raw = 'a'.repeat(64)
      prismaMock.emailVerificationToken.findUnique.mockResolvedValue(tokenRecord())
      prismaMock.user.findUnique.mockResolvedValue({ email: 'anna@beispiel.de', stripeCustomerId: 'cus_1' })
      const update = vi.fn().mockResolvedValue({ ...running, cancel_at_period_end: true })
      Object.assign(stripeMock.subscriptions, { update })
      stripeMock.subscriptions.list.mockResolvedValue({ data: [running] })

      const response = await confirm({ token: raw })
      expect(response.status).toBe(200)
      expect((await response.json()).endsAt).toBe(new Date(periodEnd * 1000).toISOString())
      expect(prismaMock.emailVerificationToken.findUnique).toHaveBeenCalledWith({
        where: { tokenHash: createHash('sha256').update(raw).digest('hex') },
      })
      expect(prismaMock.emailVerificationToken.delete).toHaveBeenCalledWith({ where: { id: 'tok_1' } })
      expect(update).toHaveBeenCalledWith('sub_1', { cancel_at_period_end: true })
      expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'anna@beispiel.de' }))
    })

    it('abgelaufener, fremder oder unbekannter Link: 400, nichts wird gekündigt', async () => {
      const update = vi.fn()
      Object.assign(stripeMock.subscriptions, { update })
      prismaMock.emailVerificationToken.findUnique.mockResolvedValue(tokenRecord({ expiresAt: new Date(Date.now() - 1) }))
      expect((await confirm({ token: 'x' })).status).toBe(400)
      prismaMock.emailVerificationToken.findUnique.mockResolvedValue(tokenRecord({ purpose: 'PASSWORD_RESET' }))
      expect((await confirm({ token: 'x' })).status).toBe(400)
      prismaMock.emailVerificationToken.findUnique.mockResolvedValue(null)
      expect((await confirm({ token: 'x' })).status).toBe(400)
      expect((await confirm({})).status).toBe(400)
      expect(update).not.toHaveBeenCalled()
    })

    it('ohne Sitzung erreichbar', async () => {
      const { isPublicApiPath } = await import('@/lib/public-api')
      const { isLegalPath } = await import('@/lib/legalPages')
      expect(isPublicApiPath('/api/billing/cancel-request')).toBe(true)
      expect(isPublicApiPath('/api/billing/cancel-confirm')).toBe(true)
      expect(isLegalPath('/kuendigen/bestaetigen')).toBe(true)
    })
  })
})
