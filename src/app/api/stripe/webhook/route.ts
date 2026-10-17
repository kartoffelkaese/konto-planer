import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { syncCustomer } from '@/lib/billing'
import { logger } from '@/lib/logger'
import { getStripe } from '@/lib/stripe'

/** Ereignisse, nach denen sich der Abo-Stand geändert haben kann */
const SYNC_EVENTS = new Set([
  'checkout.session.completed',
  // Lastschrift: Ergebnis der ersten Zahlung kommt erst Tage nach dem Kauf
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.paused',
  'customer.subscription.resumed',
  'invoice.paid',
  'invoice.payment_failed',
])

/** Kunde, zu dem das Ereignis gehört – Kennung oder eingebettetes Objekt */
function customerIdOf(event: Stripe.Event): string | null {
  const object = event.data.object as { customer?: string | { id: string } | null }
  if (!object.customer) return null
  return typeof object.customer === 'string' ? object.customer : object.customer.id
}

/**
 * Stripe-Webhook: prüft die Signatur und gleicht den betroffenen Kunden ab.
 *
 * Abgeglichen wird immer der aktuelle Stand bei Stripe (`syncCustomer`), nicht der Inhalt des
 * Ereignisses – doppelte oder vertauschte Zustellungen sind deshalb unschädlich. Bei einem
 * Fehler antwortet die Route mit 500, damit Stripe das Ereignis erneut zustellt.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  const signature = request.headers.get('stripe-signature')
  if (!secret || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe ist nicht eingerichtet' }, { status: 503 })
  }
  if (!signature) {
    return NextResponse.json({ error: 'Signatur fehlt' }, { status: 400 })
  }

  // Die Signatur gilt für den unveränderten Rohtext
  const payload = await request.text()
  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, secret)
  } catch {
    return NextResponse.json({ error: 'Ungültige Signatur' }, { status: 400 })
  }

  try {
    const seen = await prisma.stripeEvent.findUnique({ where: { id: event.id } })
    if (seen) return NextResponse.json({ received: true, duplicate: true })

    if (SYNC_EVENTS.has(event.type)) {
      const customerId = customerIdOf(event)
      if (customerId) await syncCustomer(customerId)
    }

    // Erst nach erfolgreicher Verarbeitung vermerken; gleichzeitige Zustellung desselben
    // Ereignisses scheitert hier an der eindeutigen Kennung und ist unschädlich
    await prisma.stripeEvent
      .create({ data: { id: event.id, type: event.type } })
      .catch(() => undefined)

    return NextResponse.json({ received: true })
  } catch (error) {
    logger.error('Stripe-Ereignis konnte nicht verarbeitet werden', error, {
      endpoint: '/api/stripe/webhook',
      eventType: event.type,
    })
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}
