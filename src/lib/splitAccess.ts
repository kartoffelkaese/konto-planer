import { NextResponse } from 'next/server'
import { SplitListRole, SplitListStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getEffectivePlan, getEntitlements } from '@/lib/plans'
import { PLAN_MESSAGES, planRequiredResponse } from '@/lib/planGuards'

export type SplitListAccess = {
  splitListId: string
  userId: string
  role: SplitListRole
  isArchived: boolean
  /** Ersteller der Liste darf (nach Herabstufung) keine eigenen Listen mehr führen – Liste nur lesbar */
  planLocked: boolean
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
      splitList: {
        select: {
          status: true,
          createdBy: { select: { plan: true, planExpiresAt: true } },
        },
      },
    },
  })

  if (!membership) return null

  return {
    splitListId,
    userId,
    role: membership.role,
    isArchived: membership.splitList.status === SplitListStatus.ARCHIVED,
    planLocked: !getEntitlements(getEffectivePlan(membership.splitList.createdBy)).splitOwnLists,
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
  if (access.planLocked) return planRequiredResponse(PLAN_MESSAGES.splitListLocked)
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

export { decimalToNumber } from '@/lib/splitFormatters'
