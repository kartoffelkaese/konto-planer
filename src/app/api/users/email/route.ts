import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { EmailVerificationPurpose } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { getUserBySession, isErrorResponse } from '@/lib/api-auth'
import { normalizeEmail } from '@/lib/accounts'
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
} from '@/lib/rate-limit'
import {
  createVerificationToken,
  isEmailTaken,
  sendEmailChangeVerificationEmail,
} from '@/lib/emailVerification'

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await getUserBySession()
    if (isErrorResponse(authResult)) return authResult

    const { user } = authResult

    const ip = getClientIp(request.headers)
    const { allowed } = checkRateLimit(
      `email-change:${ip}:${user.id}`,
      RATE_LIMITS.emailChange
    )
    if (!allowed) {
      return NextResponse.json(
        { error: 'Zu viele Versuche. Bitte später erneut versuchen.' },
        { status: 429 }
      )
    }

    const { newEmail: rawNewEmail, password } = await request.json()
    const newEmail = normalizeEmail(String(rawNewEmail || ''))

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json(
        { error: 'Ungültige E-Mail-Adresse' },
        { status: 400 }
      )
    }

    if (newEmail === user.email) {
      return NextResponse.json(
        { error: 'Die neue E-Mail-Adresse ist identisch mit der aktuellen.' },
        { status: 400 }
      )
    }

    if (await isEmailTaken(newEmail, user.id)) {
      return NextResponse.json(
        { error: 'Diese E-Mail-Adresse wird bereits verwendet' },
        { status: 400 }
      )
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Passwort ist erforderlich' },
        { status: 400 }
      )
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Falsches Passwort' },
        { status: 400 }
      )
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { pendingEmail: newEmail },
    })

    try {
      const rawToken = await createVerificationToken(
        user.id,
        EmailVerificationPurpose.EMAIL_CHANGE,
        newEmail
      )
      await sendEmailChangeVerificationEmail(newEmail, rawToken)
    } catch (error) {
      await prisma.user.update({
        where: { id: user.id },
        data: { pendingEmail: null },
      })
      console.error('Email change verification send failed:', error)
      return NextResponse.json(
        { error: 'Bestätigungs-E-Mail konnte nicht gesendet werden.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Bestätigungs-E-Mail gesendet. Bitte prüfen Sie Ihr Postfach.',
      pendingEmail: newEmail,
    })
  } catch (error) {
    console.error('Error updating email:', error)
    return NextResponse.json(
      { error: 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    )
  }
}
