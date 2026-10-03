import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { readJsonBody, isErrorResponse } from '@/lib/api-auth'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'
import { verifyEmailToken } from '@/lib/emailVerification'
import { logger } from '@/lib/logger'

/**
 * Alte Links auf die API: zur Bestätigungsseite weiterleiten. Bestätigt wird erst per Knopf
 * (POST) – automatische Link-Prüfer in Mailprogrammen lösen so nichts aus.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  const target = new URL('/auth/verify-email', request.url)
  if (token) target.searchParams.set('token', token)
  return NextResponse.redirect(target)
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers)
    const { allowed } = checkRateLimit(`verify-email:${ip}`, RATE_LIMITS.verifyEmail)
    if (!allowed) {
      return NextResponse.json({ ok: false, error: 'invalid' }, { status: 429 })
    }

    const body = await readJsonBody<{ token?: unknown }>(request)
    if (isErrorResponse(body)) return body
    if (typeof body.token !== 'string' || !body.token) {
      return NextResponse.json({ ok: false, error: 'missing' }, { status: 400 })
    }

    const result = await verifyEmailToken(body.token)
    return NextResponse.json(result, { status: result.ok ? 200 : 400 })
  } catch (error) {
    logger.error('E-Mail-Bestätigung fehlgeschlagen', error, { endpoint: '/api/auth/verify-email' })
    return NextResponse.json({ ok: false, error: 'invalid' }, { status: 500 })
  }
}
