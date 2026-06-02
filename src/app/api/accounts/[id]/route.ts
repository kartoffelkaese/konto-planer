import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { AccountMemberRole } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getAccountContextForAccountId } from '@/lib/account-context'
import { getFirstAccountIdForUser } from '@/lib/accounts'
import { isErrorResponse } from '@/lib/api-auth'
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
} from '@/lib/rate-limit'
import { unlinkTransfersTargetingAccount } from '@/lib/transfers'

type RouteParams = { params: Promise<{ id: string }> }

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id: accountId } = await params
  const ctx = await getAccountContextForAccountId(accountId)
  if (isErrorResponse(ctx)) return ctx

  const session = await auth()
  if (session?.activeAccountId !== accountId) {
    return NextResponse.json(
      {
        error:
          'Es kann nur das aktuell gewählte Buchführungs-Konto gelöscht werden. Bitte wechseln Sie zuerst in der Navigation.',
      },
      { status: 400 }
    )
  }

  if (ctx.membership.role !== AccountMemberRole.OWNER) {
    return NextResponse.json(
      { error: 'Nur der Inhaber kann dieses Buchführungs-Konto löschen' },
      { status: 403 }
    )
  }

  const ip = getClientIp(request.headers)
  const { allowed } = checkRateLimit(
    `financial-account-delete:${ip}:${ctx.user.id}`,
    RATE_LIMITS.accountDelete
  )
  if (!allowed) {
    return NextResponse.json(
      { error: 'Zu viele Versuche. Bitte später erneut versuchen.' },
      { status: 429 }
    )
  }

  const membershipCount = await prisma.accountMember.count({
    where: { userId: ctx.user.id },
  })

  if (membershipCount <= 1) {
    return NextResponse.json(
      {
        error:
          'Ihr letztes verfügbares Buchführungs-Konto kann hier nicht gelöscht werden. Nutzen Sie unten „Anmeldung löschen“, wenn Sie den Zugang vollständig entfernen möchten.',
      },
      { status: 400 }
    )
  }

  const otherMembership = await prisma.accountMember.findFirst({
    where: {
      userId: ctx.user.id,
      accountId: { not: accountId },
    },
    orderBy: { createdAt: 'asc' },
    select: { accountId: true },
  })

  if (!otherMembership) {
    return NextResponse.json(
      { error: 'Kein anderes Konto zum Wechseln gefunden' },
      { status: 400 }
    )
  }

  await unlinkTransfersTargetingAccount(accountId)

  await prisma.account.delete({
    where: { id: accountId },
  })

  const nextAccountId =
    otherMembership.accountId ?? (await getFirstAccountIdForUser(ctx.user.id))

  return NextResponse.json({
    message: 'Buchführungs-Konto gelöscht',
    nextAccountId,
  })
}
