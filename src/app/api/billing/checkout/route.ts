import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isErrorResponse, readJsonBody } from '@/lib/api-auth'
import { canBillingSetPlan, ensureStripeCustomer } from '@/lib/billing'
import { hasRunningSubscription, requireBillingUser } from '@/lib/billingRoute'
import { getAuthBaseUrl } from '@/lib/email'
import { PLAN_LABELS } from '@/lib/plans'
import { withErrorHandling } from '@/lib/route-handler'
import { getStripe, priceIdFor } from '@/lib/stripe'

/** Stripe verlangt für einen Testzeitraum mindestens 48 Stunden Rest; etwas Puffer dazu */
const MIN_TRIAL_REST_MS = 49 * 60 * 60 * 1000

/**
 * Startet den Kauf von „Komplett“: legt bei Bedarf den Stripe-Kunden an und gibt die Adresse
 * der von Stripe gehosteten Bezahlseite zurück. Das Level setzt erst der Abgleich nach der Zahlung.
 */
export const POST = withErrorHandling('/api/billing/checkout', async function POST(request: NextRequest) {
  const auth = await requireBillingUser()
  if (isErrorResponse(auth)) return auth
  const { user } = auth

  const body = await readJsonBody<{ interval?: unknown }>(request)
  if (isErrorResponse(body)) return body
  if (body.interval !== 'MONTHLY' && body.interval !== 'YEARLY') {
    return NextResponse.json({ error: 'Bitte wähle monatlich oder jährlich' }, { status: 400 })
  }

  if (!canBillingSetPlan(user)) {
    return NextResponse.json(
      { error: `Du hast „${PLAN_LABELS.FULL}“ bereits – ein Abo ist nicht nötig.` },
      { status: 400 }
    )
  }
  if (hasRunningSubscription(user.stripeSubscriptionStatus)) {
    return NextResponse.json(
      { error: 'Es läuft bereits ein Abo. Du kannst es unter „Abo verwalten“ ändern.' },
      { status: 409 }
    )
  }

  const customer = await ensureStripeCustomer(user)
  const baseUrl = getAuthBaseUrl()

  // Restliche Tage der Testphase verfallen nicht: Das Abo beginnt erst mit ihrem Ende
  const trialRest =
    user.planSource === 'TRIAL' && user.planExpiresAt
      ? user.planExpiresAt.getTime() - Date.now()
      : 0
  const trialEnd =
    trialRest > MIN_TRIAL_REST_MS ? Math.floor(user.planExpiresAt!.getTime() / 1000) : undefined

  const session = await getStripe().checkout.sessions.create({
    mode: 'subscription',
    customer,
    client_reference_id: user.id,
    line_items: [{ price: priceIdFor(body.interval), quantity: 1 }],
    locale: 'de',
    success_url: `${baseUrl}/settings?billing=success#plan`,
    cancel_url: `${baseUrl}/settings?billing=cancelled#plan`,
    subscription_data: {
      metadata: { userId: user.id },
      ...(trialEnd ? { trial_end: trialEnd } : {}),
    },
    ...(process.env.STRIPE_TOS_CONSENT === 'true'
      ? { consent_collection: { terms_of_service: 'required' as const } }
      : {}),
  })

  if (!session.url) {
    return NextResponse.json({ error: 'Der Kauf konnte nicht gestartet werden' }, { status: 502 })
  }
  return NextResponse.json({ url: session.url })
})
