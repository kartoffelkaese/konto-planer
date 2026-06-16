import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SplitInviteStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { getUserBySession, isErrorResponse } from '@/lib/api-auth'
import { normalizeEmail } from '@/lib/accounts'
import {
  requireSplitListAccess,
  requireSplitListOwner,
  requireSplitListWrite,
} from '@/lib/splitAccess'
import {
  getSplitDisplayNameForUser,
  resolveUniqueSplitDisplayName,
} from '@/lib/splitUserDisplayName'
import { serializeParticipant } from '@/lib/splitSerialize'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const access = await requireSplitListAccess(authResult.user.id, id)
  if (access instanceof NextResponse) return access

  const participants = await prisma.splitParticipant.findMany({
    where: { splitListId: id },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })

  const pendingInvites = await prisma.splitListInvite.findMany({
    where: { splitListId: id, status: SplitInviteStatus.PENDING },
    select: { participantId: true },
  })

  const pendingSet = new Set(
    pendingInvites
      .map((i) => i.participantId)
      .filter((pid): pid is string => pid != null)
  )

  return NextResponse.json(
    participants.map((p) =>
      serializeParticipant(p, {
        hasAccount: p.userId != null,
        pendingInvite: pendingSet.has(p.id),
      })
    )
  )
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const access = await requireSplitListAccess(authResult.user.id, id)
  if (access instanceof NextResponse) return access

  const writeError = requireSplitListWrite(access)
  if (writeError) return writeError

  let body: { displayName?: string; email?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
  }

  const manualDisplayName = body.displayName?.trim()
  if (!manualDisplayName && !body.email?.trim()) {
    return NextResponse.json(
      { error: 'Anzeigename ist erforderlich' },
      { status: 400 }
    )
  }

  const count = await prisma.splitParticipant.count({ where: { splitListId: id } })

  const email = body.email?.trim()
    ? normalizeEmail(body.email.trim())
    : null

  let linkedUserId: string | null = null
  if (email) {
    const linkedUser = await prisma.user.findUnique({ where: { email } })
    if (linkedUser) {
      linkedUserId = linkedUser.id
      const existingMember = await prisma.splitListMember.findUnique({
        where: {
          splitListId_userId: { splitListId: id, userId: linkedUser.id },
        },
      })
      if (!existingMember && linkedUser.id !== authResult.user.id) {
        await prisma.splitListMember.create({
          data: {
            splitListId: id,
            userId: linkedUser.id,
            role: 'MEMBER',
          },
        })
      }
    }
  }

  let displayName = manualDisplayName ?? ''
  if (linkedUserId) {
    const session = await auth()
    const preferredAccountId =
      linkedUserId === authResult.user.id ? session?.activeAccountId : null
    displayName = await getSplitDisplayNameForUser(
      linkedUserId,
      preferredAccountId
    )
  }
  if (!displayName) {
    return NextResponse.json(
      { error: 'Anzeigename ist erforderlich' },
      { status: 400 }
    )
  }

  displayName = await resolveUniqueSplitDisplayName(id, displayName)

  const existing = await prisma.splitParticipant.findFirst({
    where: { splitListId: id, displayName },
  })
  if (existing) {
    return NextResponse.json(
      { error: 'Teilnehmer mit diesem Namen existiert bereits' },
      { status: 400 }
    )
  }

  const participant = await prisma.$transaction(async (tx) => {
    const created = await tx.splitParticipant.create({
      data: {
        splitListId: id,
        displayName,
        userId: linkedUserId,
        sortOrder: count,
      },
    })

    if (email && linkedUserId == null) {
      await tx.splitListInvite.upsert({
        where: {
          splitListId_email: { splitListId: id, email },
        },
        create: {
          splitListId: id,
          email,
          participantId: created.id,
          invitedByUserId: authResult.user.id,
          status: SplitInviteStatus.PENDING,
        },
        update: {
          participantId: created.id,
          status: SplitInviteStatus.PENDING,
          invitedByUserId: authResult.user.id,
        },
      })
    } else if (email && linkedUserId) {
      await tx.splitListInvite.upsert({
        where: {
          splitListId_email: { splitListId: id, email },
        },
        create: {
          splitListId: id,
          email,
          participantId: created.id,
          invitedByUserId: authResult.user.id,
          status: SplitInviteStatus.ACCEPTED,
        },
        update: {
          participantId: created.id,
          status: SplitInviteStatus.ACCEPTED,
        },
      })
    }

    return created
  })

  return NextResponse.json(
    serializeParticipant(participant, {
      hasAccount: participant.userId != null,
      pendingInvite: email != null && linkedUserId == null,
    }),
    { status: 201 }
  )
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const access = await requireSplitListAccess(authResult.user.id, id)
  if (access instanceof NextResponse) return access

  const ownerError = requireSplitListOwner(access)
  if (ownerError) return ownerError

  const writeError = requireSplitListWrite(access)
  if (writeError) return writeError

  let body: { participantId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
  }

  if (!body.participantId) {
    return NextResponse.json(
      { error: 'participantId ist erforderlich' },
      { status: 400 }
    )
  }

  const participant = await prisma.splitParticipant.findFirst({
    where: { id: body.participantId, splitListId: id },
  })

  if (!participant) {
    return NextResponse.json(
      { error: 'Teilnehmer nicht gefunden' },
      { status: 404 }
    )
  }

  const expenseCount = await prisma.splitExpense.count({
    where: {
      splitListId: id,
      OR: [
        { paidByParticipantId: body.participantId },
        { shares: { some: { participantId: body.participantId } } },
      ],
    },
  })

  if (expenseCount > 0) {
    return NextResponse.json(
      {
        error:
          'Teilnehmer kann nicht entfernt werden, solange Ausgaben verknüpft sind',
        code: 'PARTICIPANT_HAS_EXPENSES',
      },
      { status: 400 }
    )
  }

  await prisma.splitParticipant.delete({ where: { id: body.participantId } })

  return NextResponse.json({ message: 'Teilnehmer entfernt' })
}
