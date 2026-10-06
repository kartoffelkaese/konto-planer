import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEffectivePlan, getEntitlements } from '@/lib/plans'
import { hashShareToken } from '@/lib/splitShareTokenCrypto'

export {
  buildSplitShareUrl,
  generateShareToken,
  hashShareToken,
} from '@/lib/splitShareTokenCrypto'

export async function getSplitListIdByShareToken(rawToken: string): Promise<string | null> {
  const tokenHash = hashShareToken(rawToken)
  const list = await prisma.splitList.findFirst({
    where: {
      shareEnabled: true,
      shareTokenHash: tokenHash,
    },
    select: { id: true, createdBy: { select: { plan: true, planExpiresAt: true } } },
  })
  if (!list) return null
  // Freigabe-Link ruht, solange der Ersteller keine eigenen Listen führen darf
  if (!getEntitlements(getEffectivePlan(list.createdBy)).splitOwnLists) return null
  return list.id
}

export async function requireSplitListShareAccess(
  rawToken: string
): Promise<{ splitListId: string } | NextResponse> {
  const splitListId = await getSplitListIdByShareToken(rawToken)
  if (!splitListId) {
    return NextResponse.json(
      { error: 'Split-Liste nicht gefunden' },
      { status: 404 }
    )
  }
  return { splitListId }
}
