import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { getUserBySession, isErrorResponse } from '@/lib/api-auth'
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
} from '@/lib/rate-limit'

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await getUserBySession()
    if (isErrorResponse(authResult)) return authResult

    const { user, email: currentEmail } = authResult

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

    const { newEmail, password } = await request.json()

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json(
        { error: 'Ungültige E-Mail-Adresse' },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: newEmail },
    })

    if (existingUser) {
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
      where: { email: currentEmail },
      data: { email: newEmail },
    })

    return NextResponse.json({
      message: 'E-Mail-Adresse wurde erfolgreich aktualisiert',
      email: newEmail,
    })
  } catch (error) {
    console.error('Error updating email:', error)
    return NextResponse.json(
      { error: 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    )
  }
}
