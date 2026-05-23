import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { AccountMemberRole } from '@prisma/client'
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
      const memberships = await tx.accountMember.findMany({
        where: { userId: user.id },
        include: {
          account: {
            include: { members: true },
          },
        },
      })

      for (const membership of memberships) {
        const { account } = membership
        const otherMembers = account.members.filter((m) => m.userId !== user.id)

        if (otherMembers.length === 0) {
          await tx.account.delete({ where: { id: account.id } })
          continue
        }

        if (membership.role === AccountMemberRole.OWNER) {
          const ownerCount = account.members.filter(
            (m) => m.role === AccountMemberRole.OWNER
          ).length
          if (ownerCount === 1) {
            const next = otherMembers.sort(
              (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
            )[0]
            await tx.accountMember.update({
              where: { id: next.id },
              data: { role: AccountMemberRole.OWNER },
            })
          }
        }
      }

      await tx.user.delete({
        where: { id: user.id },
      })
    })

    return NextResponse.json({ message: 'Benutzerkonto erfolgreich gelöscht' })
  } catch (error) {
    console.error('Fehler beim Löschen der Anmeldung:', error)
    return NextResponse.json({ error: 'Interner Server-Fehler' }, { status: 500 })
  }
}
