import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSplitListShareAccess } from '@/lib/splitShareToken'
import { serializeExpenseForGuest } from '@/lib/splitSerialize'

type RouteParams = { params: Promise<{ token: string }> }

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { token } = await params
  const access = await requireSplitListShareAccess(token)
  if (access instanceof NextResponse) return access

  const expenses = await prisma.splitExpense.findMany({
    where: { splitListId: access.splitListId },
    include: {
      paidBy: true,
      category: true,
      shares: { select: { participantId: true } },
    },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json(expenses.map(serializeExpenseForGuest))
}
