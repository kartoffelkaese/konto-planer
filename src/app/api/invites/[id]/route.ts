import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { AccountInviteStatus, AccountMemberRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getUserBySession, isErrorResponse } from '@/lib/api-auth'
import { normalizeEmail } from '@/lib/accounts'

type RouteParams = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult
  const email = normalizeEmail(user.email)

  let body: { action?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
  }

  const action = body.action
  if (action !== 'accept' && action !== 'decline') {
    return NextResponse.json(
      { error: 'action muss „accept" oder „decline" sein' },
      { status: 400 }
    )
  }

  const invite = await prisma.accountInvite.findFirst({
    where: {
      id,
      email,
      status: AccountInviteStatus.PENDING,
    },
    include: { account: { select: { id: true, name: true } } },
  })

  if (!invite) {
    return NextResponse.json(
      { error: 'Einladung nicht gefunden oder bereits bearbeitet' },
      { status: 404 }
    )
  }

  if (action === 'decline') {
    await prisma.accountInvite.update({
      where: { id },
      data: { status: AccountInviteStatus.REVOKED },
    })
    return NextResponse.json({
      message: 'Einladung abgelehnt',
      accountName: invite.account.name,
    })
  }

  const existingMember = await prisma.accountMember.findUnique({
    where: {
      accountId_userId: {
        accountId: invite.accountId,
        userId: user.id,
      },
    },
  })

  if (existingMember) {
    await prisma.accountInvite.update({
      where: { id },
      data: { status: AccountInviteStatus.ACCEPTED },
    })
    return NextResponse.json({
      message: 'Sie haben bereits Zugriff auf dieses Konto',
      accountId: invite.accountId,
      accountName: invite.account.name,
    })
  }

  await prisma.$transaction(async (tx) => {
    const memberRole =
      invite.role === AccountMemberRole.OWNER
        ? AccountMemberRole.MEMBER
        : invite.role
    await tx.accountMember.create({
      data: {
        accountId: invite.accountId,
        userId: user.id,
        role: memberRole,
      },
    })
    await tx.accountInvite.update({
      where: { id },
      data: { status: AccountInviteStatus.ACCEPTED },
    })
  })

  return NextResponse.json({
    message: 'Einladung angenommen',
    accountId: invite.accountId,
    accountName: invite.account.name,
  })
}
