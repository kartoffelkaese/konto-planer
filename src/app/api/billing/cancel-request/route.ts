import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isErrorResponse, readJsonBody } from '@/lib/api-auth'
import { isValidEmail, normalizeEmail } from '@/lib/accounts'
import { sendCancellationRequest } from '@/lib/billingEmails'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'
import { withErrorHandling } from '@/lib/route-handler'
import { billingEnabled } from '@/lib/stripe'

const MAX_NOTE_LENGTH = 500

/**
 * Kündigung ohne Anmeldung: nimmt die E-Mail-Adresse entgegen, gibt den Auftrag an den
 * Betreiber weiter und bestätigt den Eingang. Die Antwort verrät nicht, ob es zu der
 * Adresse ein Abo gibt.
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

  const body = await readJsonBody<{ email?: unknown; note?: unknown }>(request)
  if (isErrorResponse(body)) return body

  const email = typeof body.email === 'string' ? normalizeEmail(body.email) : ''
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Bitte gib eine gültige E-Mail-Adresse ein' }, { status: 400 })
  }
  const note =
    typeof body.note === 'string' && body.note.trim()
      ? body.note.trim().slice(0, MAX_NOTE_LENGTH)
      : null

  await sendCancellationRequest(email, note)
  return NextResponse.json({ received: true })
})
