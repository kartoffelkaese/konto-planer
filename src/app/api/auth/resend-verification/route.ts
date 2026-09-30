import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normalizeEmail } from '@/lib/accounts'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'
import { cleanupUnverifiedUsers } from '@/lib/cleanupUnverifiedUsers'
import {
  createVerificationToken,
  sendSignupVerificationEmail,
} from '@/lib/emailVerification'
import { EmailVerificationPurpose } from '@prisma/client'
import { logger } from '@/lib/logger'

const GENERIC_MESSAGE =
  'Falls ein unbestätigtes Konto mit dieser E-Mail existiert, wurde eine Bestätigungs-E-Mail gesendet.'

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers)
    const body = await request.json()
    const email = normalizeEmail(String(body.email || ''))

    const { allowed } = checkRateLimit(
      `resend-verification:${ip}:${email}`,
      RATE_LIMITS.resendVerification
    )
    if (!allowed) {
      return NextResponse.json(
        { message: 'Zu viele Anfragen. Bitte später erneut versuchen.' },
        { status: 429 }
      )
    }

    await cleanupUnverifiedUsers()

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, emailVerified: true },
    })

    if (user && !user.emailVerified) {
      try {
        const rawToken = await createVerificationToken(
          user.id,
          EmailVerificationPurpose.SIGNUP
        )
        await sendSignupVerificationEmail(email, rawToken)
      } catch (error) {
        logger.error('Resend verification email failed', error, { endpoint: '/api/auth/resend-verification' })
      }
    }

    return NextResponse.json({ message: GENERIC_MESSAGE })
  } catch (error) {
    logger.error('Resend verification error', error, { endpoint: '/api/auth/resend-verification' })
    return NextResponse.json(
      { message: GENERIC_MESSAGE },
      { status: 200 }
    )
  }
}
