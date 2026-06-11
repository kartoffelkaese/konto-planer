import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { EmailVerificationPurpose } from '@prisma/client'
import { getUserBySession, isErrorResponse } from '@/lib/api-auth'
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
} from '@/lib/rate-limit'
import {
  createVerificationToken,
  sendEmailChangeVerificationEmail,
} from '@/lib/emailVerification'

export async function POST(request: NextRequest) {
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult

  const ip = getClientIp(request.headers)
  const { allowed } = checkRateLimit(
    `email-change-resend:${ip}:${user.id}`,
    RATE_LIMITS.emailChangeResend
  )
  if (!allowed) {
    return NextResponse.json(
      { error: 'Zu viele Anfragen. Bitte später erneut versuchen.' },
      { status: 429 }
    )
  }

  if (!user.pendingEmail) {
    return NextResponse.json(
      { error: 'Keine ausstehende E-Mail-Änderung.' },
      { status: 400 }
    )
  }

  try {
    const rawToken = await createVerificationToken(
      user.id,
      EmailVerificationPurpose.EMAIL_CHANGE,
      user.pendingEmail
    )
    await sendEmailChangeVerificationEmail(user.pendingEmail, rawToken)
  } catch (error) {
    console.error('Email change resend failed:', error)
    return NextResponse.json(
      { error: 'E-Mail konnte nicht gesendet werden.' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    message: 'Bestätigungs-E-Mail erneut gesendet.',
    pendingEmail: user.pendingEmail,
  })
}
