import { NextResponse } from 'next/server'
import { SplitListRole, SplitListStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { syncOwnSplitParticipantInList } from '@/lib/splitUserDisplayName'

export type SplitListAccess = {
  splitListId: string
  userId: string
  role: SplitListRole
  isArchived: boolean
}

export async function getSplitListAccess(
  userId: string,
  splitListId: string
): Promise<SplitListAccess | null> {
  const membership = await prisma.splitListMember.findUnique({
    where: {
      splitListId_userId: {
        splitListId,
        userId,
      },
    },
    include: {
      splitList: { select: { status: true } },
    },
  })

  if (!membership) return null

  return {
    splitListId,
    userId,
    role: membership.role,
    isArchived: membership.splitList.status === SplitListStatus.ARCHIVED,
  }
}

export async function requireSplitListAccess(
  userId: string,
  splitListId: string
): Promise<SplitListAccess | NextResponse> {
  const access = await getSplitListAccess(userId, splitListId)
  if (!access) {
    return NextResponse.json(
      { error: 'Split-Liste nicht gefunden oder kein Zugriff' },
      { status: 404 }
    )
  }

  const session = await auth()
  await syncOwnSplitParticipantInList(
    userId,
    splitListId,
    session?.activeAccountId
  )

  return access
}

export function requireSplitListWrite(
  access: SplitListAccess
): NextResponse | null {
  if (access.isArchived) {
    return NextResponse.json(
      { error: 'Archivierte Listen können nicht bearbeitet werden' },
      { status: 403 }
    )
  }
  return null
}

export function requireSplitListOwner(
  access: SplitListAccess
): NextResponse | null {
  if (access.role !== SplitListRole.OWNER) {
    return NextResponse.json(
      { error: 'Nur der Ersteller kann diese Aktion ausführen' },
      { status: 403 }
    )
  }
  return null
}

export function decimalToNumber(value: { toString(): string } | number): number {
  return typeof value === 'number' ? value : Number(value.toString())
}
