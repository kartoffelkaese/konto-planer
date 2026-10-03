import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSplitListShareAccess } from '@/lib/splitShareToken'
import { serializeListForGuest } from '@/lib/splitSerialize'
import { withErrorHandling } from '@/lib/route-handler'

type RouteParams = { params: Promise<{ token: string }> }

export const GET = withErrorHandling('/api/split/public/:token', async function GET(_request: NextRequest, { params }: RouteParams) {
  const { token } = await params
  const access = await requireSplitListShareAccess(token)
  if (access instanceof NextResponse) return access

  const list = await prisma.splitList.findUnique({
    where: { id: access.splitListId },
    include: {
      participants: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
      categories: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
      currencies: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
    },
  })

  if (!list) {
    return NextResponse.json({ error: 'Split-Liste nicht gefunden' }, { status: 404 })
  }

  return NextResponse.json(serializeListForGuest(list))
})
