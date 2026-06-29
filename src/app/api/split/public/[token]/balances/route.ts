import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { computeBalancesWithSuggestions } from '@/lib/splitBalances'
import { decimalToNumber } from '@/lib/splitAccess'
import { requireSplitListShareAccess } from '@/lib/splitShareToken'

type RouteParams = { params: Promise<{ token: string }> }

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { token } = await params
  const access = await requireSplitListShareAccess(token)
  if (access instanceof NextResponse) return access

  const splitListId = access.splitListId

  const [participants, expenses, settlements] = await Promise.all([
    prisma.splitParticipant.findMany({
      where: { splitListId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.splitExpense.findMany({
      where: { splitListId },
      include: { shares: { select: { participantId: true } } },
    }),
    prisma.splitSettlement.findMany({ where: { splitListId } }),
  ])

  const expenseInputs = expenses.map((e) => ({
    id: e.id,
    amount: decimalToNumber(e.amount),
    paidByParticipantId: e.paidByParticipantId,
    shareParticipantIds: e.shares.map((s) => s.participantId),
  }))

  const settlementInputs = settlements.map((s) => ({
    fromParticipantId: s.fromParticipantId,
    toParticipantId: s.toParticipantId,
    amount: decimalToNumber(s.amount),
  }))

  const participantInfos = participants.map((p) => ({
    id: p.id,
    displayName: p.displayName,
  }))

  const { balances, suggestions } = computeBalancesWithSuggestions(
    participantInfos,
    expenseInputs,
    settlementInputs
  )

  const totalExpenses = expenseInputs.reduce((sum, e) => sum + e.amount, 0)

  return NextResponse.json({
    balances,
    suggestions,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
  })
}
