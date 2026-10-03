import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getUserBySession, isErrorResponse, readJsonBody } from '@/lib/api-auth'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'
import { hashPassword } from '@/lib/password-hash'
import { validatePassword } from '@/lib/password-policy'
import { logger } from '@/lib/logger'

/** Passwort ändern; beendet alle anderen Sitzungen (die eigene hebt der Client per update() an) */
export async function PATCH(request: Request) {
  try {
    const authResult = await getUserBySession()
    if (isErrorResponse(authResult)) return authResult
    const { user } = authResult

    const ip = getClientIp(request.headers)
    const { allowed } = checkRateLimit(
      `password-change:${ip}:${user.id}`,
      RATE_LIMITS.passwordChange
    )
    if (!allowed) {
      return NextResponse.json(
        { error: 'Zu viele Versuche. Bitte später erneut versuchen.' },
        { status: 429 }
      )
    }

    const body = await readJsonBody<{ currentPassword?: unknown; newPassword?: unknown }>(request)
    if (isErrorResponse(body)) return body
    const { currentPassword, newPassword } = body

    if (typeof currentPassword !== 'string' || !currentPassword || typeof newPassword !== 'string') {
      return NextResponse.json({ error: 'Bitte fülle alle Felder aus' }, { status: 400 })
    }

    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      return NextResponse.json({ error: 'Das aktuelle Passwort ist falsch' }, { status: 400 })
    }

    const passwordError = validatePassword(newPassword)
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 })
    }

    if (newPassword === currentPassword) {
      return NextResponse.json(
        { error: 'Das neue Passwort muss sich vom aktuellen unterscheiden' },
        { status: 400 }
      )
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(newPassword),
        sessionVersion: { increment: 1 },
      },
    })

    return NextResponse.json({ message: 'Passwort geändert. Andere Anmeldungen wurden beendet.' })
  } catch (error) {
    logger.error('Passwort ändern fehlgeschlagen', error, { endpoint: '/api/users/password' })
    return NextResponse.json({ error: 'Interner Server-Fehler' }, { status: 500 })
  }
}
