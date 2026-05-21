import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserBySession, isErrorResponse } from '@/lib/api-auth'
import { getSalaryMonthRange, isTransactionDueInSalaryMonth } from '@/lib/dateUtils'

export async function GET(_request: NextRequest) {
  try {
    const authResult = await getUserBySession()
    if (isErrorResponse(authResult)) return authResult

    const { user } = authResult

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        isRecurring: true,
      },
      orderBy: {
        date: 'desc',
      },
    })

    const { startDate, endDate } = getSalaryMonthRange(user.salaryDay)
    const recurringIds = transactions.map((t) => t.id)

    const instancesInSalaryMonth =
      recurringIds.length > 0
        ? await prisma.transaction.findMany({
            where: {
              userId: user.id,
              isRecurring: false,
              parentTransactionId: { in: recurringIds },
              date: { gte: startDate, lte: endDate },
            },
            select: { parentTransactionId: true, isConfirmed: true },
          })
        : []

    const parentsWithInstance = new Set(
      instancesInSalaryMonth
        .map((i) => i.parentTransactionId)
        .filter((id): id is string => id != null)
    )

    const enriched = transactions.map((t) => ({
      ...t,
      dueInSalaryMonth: isTransactionDueInSalaryMonth(
        {
          date: t.date,
          isRecurring: true,
          recurringInterval: t.recurringInterval,
          lastConfirmedDate: t.lastConfirmedDate,
        },
        user.salaryDay
      ),
      hasInstanceInSalaryMonth: parentsWithInstance.has(t.id),
      hasUnconfirmedInstanceInSalaryMonth: instancesInSalaryMonth.some(
        (i) => i.parentTransactionId === t.id && !i.isConfirmed
      ),
    }))

    return NextResponse.json(enriched)
  } catch (error) {
    console.error('Error fetching recurring transactions:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der wiederkehrenden Transaktionen' },
      { status: 500 }
    )
  }
}
