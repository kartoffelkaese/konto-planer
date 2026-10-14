import { NextResponse } from 'next/server'
import { isErrorResponse } from '@/lib/api-auth'
import { syncCustomer } from '@/lib/billing'
import { requireBillingUser } from '@/lib/billingRoute'
import { withErrorHandling } from '@/lib/route-handler'

/**
 * Gleicht das eigene Abo sofort mit Stripe ab – bei der Rückkehr vom Kauf oder aus dem
 * Kundenportal, damit das Level nicht erst mit dem Webhook sichtbar wird.
 */
export const POST = withErrorHandling('/api/billing/sync', async function POST() {
  const auth = await requireBillingUser()
  if (isErrorResponse(auth)) return auth

  const { stripeCustomerId } = auth.user
  if (stripeCustomerId) await syncCustomer(stripeCustomerId)

  return NextResponse.json({ synced: Boolean(stripeCustomerId) })
})
