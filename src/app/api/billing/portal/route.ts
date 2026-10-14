import { NextResponse } from 'next/server'
import { isErrorResponse } from '@/lib/api-auth'
import { requireBillingUser } from '@/lib/billingRoute'
import { getAuthBaseUrl } from '@/lib/email'
import { withErrorHandling } from '@/lib/route-handler'
import { getStripe } from '@/lib/stripe'

/** Adresse des Stripe-Kundenportals: Zahlungsmittel, Rechnungen, Intervall wechseln, kündigen */
export const POST = withErrorHandling('/api/billing/portal', async function POST() {
  const auth = await requireBillingUser()
  if (isErrorResponse(auth)) return auth
  const { user } = auth

  if (!user.stripeCustomerId) {
    return NextResponse.json({ error: 'Es gibt noch kein Abo zu verwalten' }, { status: 400 })
  }

  const configuration = process.env.STRIPE_PORTAL_CONFIGURATION
  const session = await getStripe().billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${getAuthBaseUrl()}/settings?billing=portal#plan`,
    locale: 'de',
    ...(configuration ? { configuration } : {}),
  })

  return NextResponse.json({ url: session.url })
})
