import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getUserBySession, isErrorResponse } from '@/lib/api-auth'
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
} from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { deleteUserWithData } from '@/lib/userDelete'

export async function DELETE(request: Request) {
  try {
    const authResult = await getUserBySession()
    if (isErrorResponse(authResult)) return authResult

    const { user } = authResult

    const ip = getClientIp(request.headers)
    const { allowed } = checkRateLimit(
      `account-delete:${ip}:${user.id}`,
      RATE_LIMITS.accountDelete
    )
    if (!allowed) {
      return NextResponse.json(
        { error: 'Zu viele Versuche. Bitte später erneut versuchen.' },
        { status: 429 }
      )
    }

    let body: { password?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Passwort ist erforderlich' },
        { status: 400 }
      )
    }

    if (!body.password || typeof body.password !== 'string') {
      return NextResponse.json(
        { error: 'Passwort ist erforderlich' },
        { status: 400 }
      )
    }

    const isPasswordValid = await bcrypt.compare(body.password, user.passwordHash)
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Falsches Passwort' }, { status: 400 })
    }

    await deleteUserWithData(user.id)

    return NextResponse.json({ message: 'Benutzerkonto erfolgreich gelöscht' })
  } catch (error) {
    logger.error('Fehler beim Löschen der Anmeldung', error, { endpoint: '/api/users/delete' })
    return NextResponse.json({ error: 'Interner Server-Fehler' }, { status: 500 })
  }
}
