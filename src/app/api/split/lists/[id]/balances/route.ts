import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserBySession, isErrorResponse } from '@/lib/api-auth'
import { computeBalancesWithSuggestions } from '@/lib/splitBalances'
import {
  decimalToNumber,
  requireSplitListAccess,
} from '@/lib/splitAccess'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const access = await requireSplitListAccess(authResult.user.id, id)
  if (access instanceof NextResponse) return access

  const [participants, expenses, settlements] = await Promise.all([
    prisma.splitParticipant.findMany({
      where: { splitListId: id },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.splitExpense.findMany({
      where: { splitListId: id },
      include: { shares: { select: { participantId: true } } },
    }),
    prisma.splitSettlement.findMany({ where: { splitListId: id } }),
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
