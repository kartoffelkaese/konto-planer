import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSplitListShareAccess } from '@/lib/splitShareToken'
import { serializeListForGuest } from '@/lib/splitSerialize'

type RouteParams = { params: Promise<{ token: string }> }

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { token } = await params
  const access = await requireSplitListShareAccess(token)
  if (access instanceof NextResponse) return access

  const list = await prisma.splitList.findUnique({
    where: { id: access.splitListId },
    include: {
      participants: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
      categories: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
    },
  })

  if (!list) {
    return NextResponse.json({ error: 'Split-Liste nicht gefunden' }, { status: 404 })
  }

  return NextResponse.json(serializeListForGuest(list))
}
