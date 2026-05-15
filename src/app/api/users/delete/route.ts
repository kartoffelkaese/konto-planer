import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { getUserBySession, isErrorResponse } from '@/lib/api-auth'
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
} from '@/lib/rate-limit'

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

    await prisma.$transaction(async (tx) => {
      await tx.transaction.deleteMany({
        where: { userId: user.id },
      })
      await tx.merchant.deleteMany({
        where: { userId: user.id },
      })
      await tx.category.deleteMany({
        where: { userId: user.id },
      })
      await tx.user.delete({
        where: { id: user.id },
      })
    })

    return NextResponse.json({ message: 'Konto erfolgreich gelöscht' })
  } catch (error) {
    console.error('Fehler beim Löschen des Kontos:', error)
    return NextResponse.json({ error: 'Interner Server-Fehler' }, { status: 500 })
  }
}
