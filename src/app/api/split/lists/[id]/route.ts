import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SplitListStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getUserBySession, isErrorResponse } from '@/lib/api-auth'
import {
  requireSplitListAccess,
  requireSplitListOwner,
  requireSplitListWrite,
} from '@/lib/splitAccess'
import { deleteSplitListCascade } from '@/lib/splitListDelete'
import { serializeListDetail } from '@/lib/splitSerialize'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const access = await requireSplitListAccess(authResult.user.id, id)
  if (access instanceof NextResponse) return access

  const list = await prisma.splitList.findUnique({
    where: { id },
    include: {
      participants: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
      categories: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
      _count: { select: { participants: true, expenses: true } },
      expenses: { select: { amount: true } },
      invites: {
        where: { status: 'PENDING' },
        select: { participantId: true, email: true },
      },
    },
  })

  if (!list) {
    return NextResponse.json({ error: 'Liste nicht gefunden' }, { status: 404 })
  }

  const participantMeta = new Map<
    string,
    { hasAccount?: boolean; pendingInvite?: boolean }
  >()

  for (const participant of list.participants) {
    participantMeta.set(participant.id, {
      hasAccount: participant.userId != null,
      pendingInvite: list.invites.some(
        (i) => i.participantId === participant.id
      ),
    })
  }

  return NextResponse.json(
    serializeListDetail(list, access.role, participantMeta)
  )
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const access = await requireSplitListAccess(authResult.user.id, id)
  if (access instanceof NextResponse) return access

  let body: {
    name?: string
    description?: string | null
    status?: 'ACTIVE' | 'ARCHIVED'
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
  }

  if (body.status === 'ARCHIVED') {
    const ownerError = requireSplitListOwner(access)
    if (ownerError) return ownerError
  } else if (body.status === 'ACTIVE' && access.isArchived) {
    const ownerError = requireSplitListOwner(access)
    if (ownerError) return ownerError
  } else {
    const writeError = requireSplitListWrite(access)
    if (writeError) return writeError
  }

  const data: {
    name?: string
    description?: string | null
    status?: SplitListStatus
    archivedAt?: Date | null
  } = {}

  if (body.name !== undefined) {
    const trimmed = body.name.trim()
    if (!trimmed) {
      return NextResponse.json({ error: 'Name ist erforderlich' }, { status: 400 })
    }
    data.name = trimmed
  }

  if (body.description !== undefined) {
    data.description = body.description?.trim() || null
  }

  if (body.status === 'ARCHIVED') {
    data.status = SplitListStatus.ARCHIVED
    data.archivedAt = new Date()
  } else if (body.status === 'ACTIVE') {
    data.status = SplitListStatus.ACTIVE
    data.archivedAt = null
  }

  const updated = await prisma.splitList.update({
    where: { id },
    data,
    include: {
      participants: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
      categories: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
      _count: { select: { participants: true, expenses: true } },
      expenses: { select: { amount: true } },
    },
  })

  return NextResponse.json(serializeListDetail(updated, access.role))
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const access = await requireSplitListAccess(authResult.user.id, id)
  if (access instanceof NextResponse) return access

  const ownerError = requireSplitListOwner(access)
  if (ownerError) return ownerError

  const list = await prisma.splitList.findUnique({
    where: { id },
    select: { id: true, name: true },
  })

  if (!list) {
    return NextResponse.json({ error: 'Liste nicht gefunden' }, { status: 404 })
  }

  try {
    await deleteSplitListCascade(id)
    return NextResponse.json({ message: 'Liste gelöscht', name: list.name })
  } catch (error) {
    console.error('Error deleting split list:', error)
    return NextResponse.json(
      {
        error:
          'Die Split-Liste konnte nicht gelöscht werden. Bitte versuchen Sie es erneut.',
        code: 'SPLIT_LIST_DELETE_FAILED',
      },
      { status: 500 }
    )
  }
}
