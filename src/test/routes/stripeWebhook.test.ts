import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Stripe from 'stripe'

vi.mock('@/lib/prisma', async () => (await import('@/test/routeHarness')).prismaModule)
const syncCustomer = vi.hoisted(() => vi.fn())
vi.mock('@/lib/billing', () => ({ syncCustomer }))

import { POST } from '@/app/api/stripe/webhook/route'
import { isPublicApiPath } from '@/lib/public-api'
import { prismaMock, resetRouteMocks } from '@/test/routeHarness'

const SECRET = 'whsec_test_geheim'
const stripe = new Stripe('sk_test_nur_fuer_signaturen')

function webhookRequest(event: object, secret = SECRET) {
  const payload = JSON.stringify(event)
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret })
  return new Request('http://localhost/api/stripe/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': signature },
    body: payload,
  })
}

const event = (type: string, object: object, id = 'evt_1') => ({
  id,
  object: 'event',
  type,
  data: { object },
})

beforeEach(() => {
  resetRouteMocks()
  syncCustomer.mockReset()
  syncCustomer.mockResolvedValue('updated')
  prismaMock.stripeEvent.findUnique.mockResolvedValue(null)
  prismaMock.stripeEvent.create.mockResolvedValue({})
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_nur_fuer_signaturen')
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', SECRET)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => vi.unstubAllEnvs())

describe('Stripe-Webhook', () => {
  it('ist ohne Sitzung erreichbar', () => {
    expect(isPublicApiPath('/api/stripe/webhook')).toBe(true)
  })

  it('lehnt fehlende und falsche Signaturen ab', async () => {
    const unsigned = new Request('http://localhost/api/stripe/webhook', { method: 'POST', body: '{}' })
    expect((await POST(unsigned)).status).toBe(400)

    const forged = webhookRequest(event('invoice.paid', { customer: 'cus_1' }), 'whsec_falsch')
    expect((await POST(forged)).status).toBe(400)
    expect(syncCustomer).not.toHaveBeenCalled()
  })

  it('ohne Stripe-Einrichtung: 503', async () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '')
    expect((await POST(webhookRequest(event('invoice.paid', { customer: 'cus_1' })))).status).toBe(503)
  })

  it('gleicht den Kunden ab und vermerkt das Ereignis', async () => {
    const response = await POST(webhookRequest(event('customer.subscription.updated', { customer: 'cus_1' })))
    expect(response.status).toBe(200)
    expect(syncCustomer).toHaveBeenCalledWith('cus_1')
    expect(prismaMock.stripeEvent.create).toHaveBeenCalledWith({
      data: { id: 'evt_1', type: 'customer.subscription.updated' },
    })
  })

  it('liest den Kunden auch aus einem eingebetteten Objekt', async () => {
    await POST(webhookRequest(event('checkout.session.completed', { customer: { id: 'cus_2' } })))
    expect(syncCustomer).toHaveBeenCalledWith('cus_2')
  })

  it('überspringt bereits verarbeitete Ereignisse', async () => {
    prismaMock.stripeEvent.findUnique.mockResolvedValue({ id: 'evt_1' })
    const response = await POST(webhookRequest(event('invoice.paid', { customer: 'cus_1' })))
    expect(response.status).toBe(200)
    expect(syncCustomer).not.toHaveBeenCalled()
  })

  it('ignoriert fremde Ereignistypen, bestätigt sie aber', async () => {
    const response = await POST(webhookRequest(event('charge.succeeded', { customer: 'cus_1' })))
    expect(response.status).toBe(200)
    expect(syncCustomer).not.toHaveBeenCalled()
  })

  it('Fehler beim Abgleich: 500, Ereignis wird nicht vermerkt – Stripe stellt erneut zu', async () => {
    syncCustomer.mockRejectedValue(new Error('Stripe nicht erreichbar'))
    const response = await POST(webhookRequest(event('invoice.paid', { customer: 'cus_1' })))
    expect(response.status).toBe(500)
    expect(prismaMock.stripeEvent.create).not.toHaveBeenCalled()
  })
})
