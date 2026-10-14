import { NextResponse } from 'next/server'
import { isErrorResponse } from '@/lib/api-auth'
import { cancelAtPeriodEnd } from '@/lib/billing'
import { sendCancellationConfirmation } from '@/lib/billingEmails'
import { requireBillingUser } from '@/lib/billingRoute'
import { logger } from '@/lib/logger'
import { withErrorHandling } from '@/lib/route-handler'

/** Kündigt das eigene Abo zum Ende des bezahlten Zeitraums und bestätigt das per E-Mail */
export const POST = withErrorHandling('/api/billing/cancel', async function POST() {
  const auth = await requireBillingUser()
  if (isErrorResponse(auth)) return auth
  const { user } = auth

  const endsAt = user.stripeCustomerId ? await cancelAtPeriodEnd(user.stripeCustomerId) : null
  if (!user.stripeCustomerId || endsAt === null) {
    return NextResponse.json({ error: 'Es läuft kein Abo, das gekündigt werden könnte' }, { status: 400 })
  }

  // Die Kündigung gilt auch, wenn die Bestätigung nicht zugestellt werden kann
  try {
    await sendCancellationConfirmation(user.email, endsAt)
  } catch (error) {
    logger.error('Kündigungsbestätigung konnte nicht gesendet werden', error, {
      endpoint: '/api/billing/cancel',
    })
  }

  return NextResponse.json({ endsAt: endsAt.toISOString() })
})
