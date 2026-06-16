import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserBySession, isErrorResponse } from '@/lib/api-auth'
import { decimalToNumber, requireSplitListAccess } from '@/lib/splitAccess'
import { serializeExpense, serializeSettlement } from '@/lib/splitSerialize'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const access = await requireSplitListAccess(authResult.user.id, id)
  if (access instanceof NextResponse) return access

  const [expenses, settlements, categories] = await Promise.all([
    prisma.splitExpense.findMany({
      where: { splitListId: id },
      include: {
        paidBy: true,
        category: true,
        shares: { select: { participantId: true } },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.splitSettlement.findMany({
      where: { splitListId: id },
      include: { fromParticipant: true, toParticipant: true },
      orderBy: [{ settledAt: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.splitCategory.findMany({ where: { splitListId: id } }),
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
    settlements: settlements.map(serializeSettlement),
    expenses: expenses.map(serializeExpense),
    categoryTotals,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
  })
}
