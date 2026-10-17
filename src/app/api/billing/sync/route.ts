import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isErrorResponse } from '@/lib/api-auth'
import { syncCustomer } from '@/lib/billing'
import { requireBillingUser } from '@/lib/billingRoute'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { withErrorHandling } from '@/lib/route-handler'

/** Felder, an denen sich ein geänderter Abo-Stand zeigt */
const BILLING_STATE_SELECT = {
  plan: true,
  planSource: true,
  planExpiresAt: true,
  stripeSubscriptionStatus: true,
  planInterval: true,
  planCancelAtPeriodEnd: true,
} as const

/**
 * Gleicht das eigene Abo sofort mit Stripe ab.
 *
 * - Rückkehr vom Kauf oder aus dem Kundenportal: immer.
 * - `{ "background": true }` beim Öffnen von „Dein Level“: höchstens alle paar Minuten je
 *   Nutzer. Fängt Änderungen ab, deren Webhook nicht angekommen ist.
 *
 * `changed` sagt, ob sich dabei etwas geändert hat – nur dann lädt die Oberfläche neu.
 */
export const POST = withErrorHandling('/api/billing/sync', async function POST(request: NextRequest) {
  const auth = await requireBillingUser()
  if (isErrorResponse(auth)) return auth
  const { user } = auth

  // Ein leerer oder fehlender Rumpf bedeutet: sofort abgleichen
  const body = (await request.json().catch(() => ({}))) as { background?: unknown }

  if (!user.stripeCustomerId) {
    return NextResponse.json({ synced: false, changed: false })
  }

  if (body.background === true) {
    const { allowed } = checkRateLimit(`billing-background-sync:${user.id}`, RATE_LIMITS.billingBackgroundSync)
    if (!allowed) return NextResponse.json({ synced: false, changed: false })
  }

  const pick = (u: Record<string, unknown>) =>
    JSON.stringify(Object.keys(BILLING_STATE_SELECT).map((key) => u[key] instanceof Date ? (u[key] as Date).toISOString() : u[key]))
  const before = pick(user)
  await syncCustomer(user.stripeCustomerId)
  const after = await prisma.user.findUnique({ where: { id: user.id }, select: BILLING_STATE_SELECT })

  return NextResponse.json({ synced: true, changed: after ? pick(after) !== before : false })
})
