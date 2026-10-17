import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isErrorResponse, readJsonBody } from '@/lib/api-auth'
import { cancelAtPeriodEnd } from '@/lib/billing'
import { sendCancellationConfirmation } from '@/lib/billingEmails'
import { consumeCancellationToken } from '@/lib/emailVerification'
import { logger } from '@/lib/logger'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'
import { withErrorHandling } from '@/lib/route-handler'
import { billingEnabled } from '@/lib/stripe'

/**
 * Kündigung ohne Anmeldung, Schritt 2: Der Link aus der E-Mail weist den Inhaber der Adresse
 * aus. Gekündigt wird erst mit diesem Aufruf (Knopf auf der Seite), nicht schon beim Öffnen
 * des Links – sonst könnten Mail-Scanner versehentlich kündigen.
 */
export const POST = withErrorHandling('/api/billing/cancel-confirm', async function POST(request: NextRequest) {
  if (!billingEnabled()) {
    return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  }

  const { allowed } = checkRateLimit(
    `cancel-confirm:${getClientIp(request.headers)}`,
    RATE_LIMITS.verifyEmail
  )
  if (!allowed) {
    return NextResponse.json(
      { error: 'Zu viele Versuche. Bitte später erneut versuchen.' },
      { status: 429 }
    )
  }

  const body = await readJsonBody<{ token?: unknown }>(request)
  if (isErrorResponse(body)) return body
  if (typeof body.token !== 'string' || !body.token) {
    return NextResponse.json({ error: 'Der Link ist ungültig.' }, { status: 400 })
  }

  const result = await consumeCancellationToken(body.token)
  if (!result.ok) {
    return NextResponse.json(
      {
        error:
          result.error === 'expired'
            ? 'Der Link ist abgelaufen. Bitte fordere die Kündigung erneut an.'
            : 'Der Link ist ungültig oder wurde schon verwendet.',
      },
      { status: 400 }
    )
  }

  const user = await prisma.user.findUnique({
    where: { id: result.userId },
    select: { email: true, stripeCustomerId: true },
  })
  const endsAt = user?.stripeCustomerId ? await cancelAtPeriodEnd(user.stripeCustomerId) : null
  if (!user || endsAt === null) {
    return NextResponse.json({ endsAt: null })
  }

  try {
    await sendCancellationConfirmation(user.email, endsAt)
  } catch (error) {
    logger.error('Kündigungsbestätigung konnte nicht gesendet werden', error, {
      endpoint: '/api/billing/cancel-confirm',
    })
  }

  return NextResponse.json({ endsAt: endsAt.toISOString() })
})
