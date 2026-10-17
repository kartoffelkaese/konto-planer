import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { syncCustomer } from '@/lib/billing'
import { logger } from '@/lib/logger'
import { withErrorHandling } from '@/lib/route-handler'
import { billingEnabled } from '@/lib/stripe'

const DAY_MS = 24 * 60 * 60 * 1000

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  const header = request.headers.get('authorization') ?? ''
  if (!secret || !header.startsWith('Bearer ')) return false
  const given = Buffer.from(header.slice('Bearer '.length))
  const expected = Buffer.from(secret)
  return given.length === expected.length && timingSafeEqual(given, expected)
}

/**
 * Täglicher Abgleich aller laufenden Abos mit Stripe (per Cron, siehe INSTALL.md). Fängt
 * Verlängerungen, Kündigungen und Zahlungsausfälle ab, deren Webhook nicht angekommen ist.
 * Geschützt durch `CRON_SECRET`; ohne den Wert gibt es die Route nicht.
 */
export const POST = withErrorHandling('/api/cron/stripe-sync', async function POST(request: Request) {
  if (!process.env.CRON_SECRET || !billingEnabled()) {
    return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  }
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  // Laufende Abos und solche, deren Level aus Stripe kürzlich endete oder noch gilt
  const users = await prisma.user.findMany({
    where: {
      stripeCustomerId: { not: null },
      OR: [
        { stripeSubscriptionStatus: { in: ['active', 'trialing', 'past_due'] } },
        { planSource: 'STRIPE', planExpiresAt: { gt: new Date(Date.now() - 7 * DAY_MS) } },
      ],
    },
    select: { stripeCustomerId: true },
  })

  let synced = 0
  let failed = 0
  for (const { stripeCustomerId } of users) {
    try {
      await syncCustomer(stripeCustomerId!)
      synced++
    } catch (error) {
      failed++
      logger.error('Abo-Abgleich fehlgeschlagen', error, { endpoint: '/api/cron/stripe-sync' })
    }
  }

  return NextResponse.json({ synced, failed })
})
