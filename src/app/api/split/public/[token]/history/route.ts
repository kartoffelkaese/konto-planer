import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { decimalToNumber } from '@/lib/splitAccess'
import { requireSplitListShareAccess } from '@/lib/splitShareToken'
import {
  serializeExpenseForGuest,
  serializeSettlementForGuest,
} from '@/lib/splitSerialize'

type RouteParams = { params: Promise<{ token: string }> }

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { token } = await params
  const access = await requireSplitListShareAccess(token)
  if (access instanceof NextResponse) return access

  const splitListId = access.splitListId

  const [expenses, settlements, categories] = await Promise.all([
    prisma.splitExpense.findMany({
      where: { splitListId },
      include: {
        paidBy: true,
        category: true,
        shares: { select: { participantId: true } },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.splitSettlement.findMany({
      where: { splitListId },
      include: { fromParticipant: true, toParticipant: true },
      orderBy: [{ settledAt: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.splitCategory.findMany({ where: { splitListId } }),
  ])

  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]))
  const totalsByCategory = new Map<string | null, number>()

  let totalExpenses = 0
  for (const expense of expenses) {
    const amount = decimalToNumber(expense.amount)
    totalExpenses += amount
    const key = expense.categoryId
    totalsByCategory.set(key, (totalsByCategory.get(key) ?? 0) + amount)
  }

  const categoryTotals = [...totalsByCategory.entries()]
    .map(([categoryId, total]) => ({
      categoryId,
      categoryName:
        categoryId == null
          ? 'Ohne Kategorie'
          : (categoryNameById.get(categoryId) ?? 'Unbekannt'),
      total: Math.round(total * 100) / 100,
    }))
    .sort((a, b) => b.total - a.total)

  return NextResponse.json({
    settlements: settlements.map(serializeSettlementForGuest),
    expenses: expenses.map(serializeExpenseForGuest),
    categoryTotals,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
  })
}
