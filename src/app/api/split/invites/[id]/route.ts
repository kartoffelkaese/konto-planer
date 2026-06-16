import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SplitInviteStatus, SplitListRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { getUserBySession, isErrorResponse } from '@/lib/api-auth'
import { normalizeEmail } from '@/lib/accounts'
import {
  getSplitDisplayNameForUser,
  resolveUniqueSplitDisplayName,
} from '@/lib/splitUserDisplayName'

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

  const invite = await prisma.splitListInvite.findFirst({
    where: {
      id,
      email,
      status: SplitInviteStatus.PENDING,
    },
    include: {
      splitList: { select: { id: true, name: true } },
      participant: true,
    },
  })

  if (!invite) {
    return NextResponse.json(
      { error: 'Einladung nicht gefunden oder bereits bearbeitet' },
      { status: 404 }
    )
  }

  if (action === 'decline') {
    await prisma.splitListInvite.update({
      where: { id },
      data: { status: SplitInviteStatus.REVOKED },
    })
    return NextResponse.json({
      message: 'Einladung abgelehnt',
      splitListName: invite.splitList.name,
    })
  }

  const session = await auth()
  const displayName = await resolveUniqueSplitDisplayName(
    invite.splitListId,
    await getSplitDisplayNameForUser(user.id, session?.activeAccountId),
    invite.participantId ?? undefined
  )

  await prisma.$transaction(async (tx) => {
    const existingMember = await tx.splitListMember.findUnique({
      where: {
        splitListId_userId: {
          splitListId: invite.splitListId,
          userId: user.id,
        },
      },
    })

    if (!existingMember) {
      await tx.splitListMember.create({
        data: {
          splitListId: invite.splitListId,
          userId: user.id,
          role: SplitListRole.MEMBER,
        },
      })
    }

    if (invite.participantId) {
      await tx.splitParticipant.update({
        where: { id: invite.participantId },
        data: { userId: user.id, displayName },
      })
    } else {
      const participantCount = await tx.splitParticipant.count({
        where: { splitListId: invite.splitListId },
      })
      await tx.splitParticipant.create({
        data: {
          splitListId: invite.splitListId,
          displayName,
          userId: user.id,
          sortOrder: participantCount,
        },
      })
    }

    await tx.splitListInvite.update({
      where: { id },
      data: { status: SplitInviteStatus.ACCEPTED },
    })
  })

  return NextResponse.json({
    message: 'Einladung angenommen',
    splitListId: invite.splitList.id,
    splitListName: invite.splitList.name,
  })
}
