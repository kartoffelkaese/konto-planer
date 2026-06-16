import { NextResponse } from 'next/server'
import { SplitInviteStatus, SplitListRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getUserBySession, isErrorResponse } from '@/lib/api-auth'
import { normalizeEmail } from '@/lib/accounts'

export async function GET() {
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult
  const email = normalizeEmail(user.email)

  const invites = await prisma.splitListInvite.findMany({
    where: {
      email,
      status: SplitInviteStatus.PENDING,
    },
    include: {
      splitList: { select: { id: true, name: true } },
      invitedBy: { select: { email: true } },
      participant: { select: { displayName: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(
    invites.map((i) => ({
      id: i.id,
      splitListId: i.splitList.id,
      splitListName: i.splitList.name,
      invitedByEmail: i.invitedBy.email,
      participantDisplayName: i.participant?.displayName ?? null,
      createdAt: i.createdAt.toISOString(),
    }))
  )
}
