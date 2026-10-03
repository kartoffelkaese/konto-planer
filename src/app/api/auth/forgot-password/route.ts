import { NextResponse } from 'next/server'
import { EmailVerificationPurpose } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { normalizeEmail } from '@/lib/accounts'
import { readJsonBody, isErrorResponse } from '@/lib/api-auth'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'
import { createVerificationToken, sendPasswordResetEmail } from '@/lib/emailVerification'
import { logger } from '@/lib/logger'

/** Gleiche Antwort für bekannte und unbekannte Adressen – verrät nicht, wer registriert ist */
const GENERIC_MESSAGE =
  'Falls ein Konto mit dieser E-Mail existiert, haben wir dir einen Link zum Zurücksetzen geschickt.'

export async function POST(request: Request) {
  try {
    const body = await readJsonBody<{ email?: unknown }>(request)
    if (isErrorResponse(body)) return body
    const email = normalizeEmail(typeof body.email === 'string' ? body.email : '')

    const ip = getClientIp(request.headers)
    const { allowed } = checkRateLimit(
      `password-reset-request:${ip}:${email}`,
      RATE_LIMITS.passwordResetRequest
    )
    if (!allowed) {
      return NextResponse.json(
        { message: 'Zu viele Anfragen. Bitte später erneut versuchen.' },
        { status: 429 }
      )
    }

    const user = email
      ? await prisma.user.findUnique({ where: { email }, select: { id: true } })
      : null

    if (user) {
      try {
        const rawToken = await createVerificationToken(
          user.id,
          EmailVerificationPurpose.PASSWORD_RESET
        )
        await sendPasswordResetEmail(email, rawToken)
      } catch (error) {
        logger.error('Passwort-Reset-Mail fehlgeschlagen', error, { endpoint: '/api/auth/forgot-password' })
      }
    }

    return NextResponse.json({ message: GENERIC_MESSAGE })
  } catch (error) {
    logger.error('Passwort-Reset-Anfrage fehlgeschlagen', error, { endpoint: '/api/auth/forgot-password' })
    return NextResponse.json({ message: GENERIC_MESSAGE })
  }
}
