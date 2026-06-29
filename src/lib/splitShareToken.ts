import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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
    select: { id: true },
  })
  return list?.id ?? null
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
