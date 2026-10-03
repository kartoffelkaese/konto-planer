import { NextResponse } from 'next/server'
import { readJsonBody, isErrorResponse } from '@/lib/api-auth'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'
import { hashPassword } from '@/lib/password-hash'
import { validatePassword } from '@/lib/password-policy'
import { resetPasswordWithToken } from '@/lib/emailVerification'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers)
    const { allowed } = checkRateLimit(`password-reset:${ip}`, RATE_LIMITS.passwordReset)
    if (!allowed) {
      return NextResponse.json(
        { message: 'Zu viele Versuche. Bitte später erneut versuchen.' },
        { status: 429 }
      )
    }

    const body = await readJsonBody<{ token?: unknown; password?: unknown }>(request)
    if (isErrorResponse(body)) return body
    const { token, password } = body

    if (typeof token !== 'string' || !token || typeof password !== 'string') {
      return NextResponse.json({ message: 'Ungültige Anfrage' }, { status: 400 })
    }

    const passwordError = validatePassword(password)
    if (passwordError) {
      return NextResponse.json({ message: passwordError }, { status: 400 })
    }

    const result = await resetPasswordWithToken(token, await hashPassword(password))
    if (!result.ok) {
      return NextResponse.json(
        {
          message:
            result.error === 'expired'
              ? 'Der Link ist abgelaufen. Bitte fordere einen neuen an.'
              : 'Der Link ist ungültig oder wurde bereits verwendet.',
        },
        { status: 400 }
      )
    }

    return NextResponse.json({ message: 'Passwort geändert. Du kannst dich jetzt anmelden.' })
  } catch (error) {
    logger.error('Passwort zurücksetzen fehlgeschlagen', error, { endpoint: '/api/auth/reset-password' })
    return NextResponse.json({ message: 'Ein Fehler ist aufgetreten' }, { status: 500 })
  }
}
