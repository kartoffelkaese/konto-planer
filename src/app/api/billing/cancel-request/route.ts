import { NextResponse, after } from 'next/server'
import type { NextRequest } from 'next/server'
import { EmailVerificationPurpose } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { isErrorResponse, readJsonBody } from '@/lib/api-auth'
import { isValidEmail, normalizeEmail } from '@/lib/accounts'
import { sendCancellationLink } from '@/lib/billingEmails'
import { hasRunningSubscription } from '@/lib/billingRoute'
import { getAuthBaseUrl } from '@/lib/email'
import { createVerificationToken } from '@/lib/emailVerification'
import { logger } from '@/lib/logger'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'
import { withErrorHandling } from '@/lib/route-handler'
import { billingEnabled } from '@/lib/stripe'

/**
 * Kündigung ohne Anmeldung, Schritt 1: Gibt es zur Adresse ein laufendes Abo, geht ein Link
 * zur Bestätigung an genau diese Adresse. Die Antwort ist immer dieselbe und kommt, bevor
 * gesucht und verschickt wird – sie verrät weder über Inhalt noch Laufzeit, ob es Adresse
 * oder Abo gibt.
 */
export const POST = withErrorHandling('/api/billing/cancel-request', async function POST(request: NextRequest) {
  if (!billingEnabled()) {
    return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  }

  const { allowed } = checkRateLimit(
    `cancel-request:${getClientIp(request.headers)}`,
    RATE_LIMITS.cancelRequest
  )
  if (!allowed) {
    return NextResponse.json(
      { error: 'Zu viele Versuche. Bitte später erneut versuchen.' },
      { status: 429 }
    )
  }

  const body = await readJsonBody<{ email?: unknown }>(request)
  if (isErrorResponse(body)) return body

  const email = typeof body.email === 'string' ? normalizeEmail(body.email) : ''
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Bitte gib eine gültige E-Mail-Adresse ein' }, { status: 400 })
  }

  // Je Adresse höchstens so viele Links wie je IP – bremst das Zuschütten fremder Postfächer
  const perAddress = checkRateLimit(`cancel-request-email:${email}`, RATE_LIMITS.cancelRequest)

  after(async () => {
    if (!perAddress.allowed) return
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, stripeSubscriptionStatus: true },
      })
      if (!user || !hasRunningSubscription(user.stripeSubscriptionStatus)) return

      const token = await createVerificationToken(user.id, EmailVerificationPurpose.CANCEL_SUBSCRIPTION)
      const confirmUrl = `${getAuthBaseUrl()}/kuendigen/bestaetigen?token=${encodeURIComponent(token)}`
      await sendCancellationLink(user.email, confirmUrl)
    } catch (error) {
      logger.error('Kündigungslink konnte nicht verschickt werden', error, {
        endpoint: '/api/billing/cancel-request',
      })
    }
  })

  return NextResponse.json({ received: true })
})
