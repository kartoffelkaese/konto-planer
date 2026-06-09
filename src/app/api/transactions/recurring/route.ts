import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAccountContext } from '@/lib/account-context'
import { isErrorResponse } from '@/lib/api-auth'
import { assertPlanningAccount } from '@/lib/simpleAccount'
import { getSalaryMonthRange, isTransactionDueInSalaryMonth } from '@/lib/dateUtils'
import { transactionCategoryInclude } from '@/lib/merchantCategories'

export async function GET(_request: NextRequest) {
  try {
    const ctx = await getAccountContext()
    if (isErrorResponse(ctx)) return ctx

    const { account } = ctx

    const planningError = assertPlanningAccount(account)
    if (planningError) return planningError

    const transactions = await prisma.transaction.findMany({
      where: {
        accountId: account.id,
        isRecurring: true,
      },
      include: transactionCategoryInclude,
      orderBy: {
        date: 'desc',
      },
    })

    const { startDate, endDate } = getSalaryMonthRange(account.salaryDay)
    const recurringIds = transactions.map((t) => t.id)

    const instancesInSalaryMonth =
      recurringIds.length > 0
        ? await prisma.transaction.findMany({
            where: {
              accountId: account.id,
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
      dueInSalaryMonth: t.isRecurringPaused
        ? false
        : isTransactionDueInSalaryMonth(
            {
              date: t.date,
              isRecurring: true,
              isRecurringPaused: t.isRecurringPaused,
              recurringInterval: t.recurringInterval,
              lastConfirmedDate: t.lastConfirmedDate,
            },
            account.salaryDay
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
