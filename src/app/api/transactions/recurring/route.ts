import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAccountContext } from '@/lib/account-context'
import { isErrorResponse } from '@/lib/api-auth'
import { assertPlanningAccount } from '@/lib/simpleAccount'
import { berlinDayKey, getSalaryMonthRange } from '@/lib/dateUtils'
import { loadInstanceKeys, openDueDatesWithoutInstance } from '@/lib/recurringAutoPending'
import { transactionCategoryInclude } from '@/lib/merchantCategories'
import { logger } from '@/lib/logger'

export async function GET() {
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

    // Offene Termine: ohne Buchung und nicht schon eingetragen bzw. bewusst übergangen.
    // „Am Buchungstag“ trägt künftige Termine selbst ein – die gelten nicht als fällig.
    const now = new Date()
    const onDueDate = account.recurringAutoMode === 'ON_DUE_DATE'
    const instanceKeys = await loadInstanceKeys(account.id, recurringIds, startDate, endDate)
    const todayKey = berlinDayKey(now)

    const enriched = transactions.map((t) => {
      const open = t.isRecurringPaused ? [] : openDueDatesWithoutInstance(t, startDate, endDate, instanceKeys)
      const due = onDueDate ? open.filter((date) => berlinDayKey(date) <= todayKey) : open
      const upcoming = onDueDate ? open.find((date) => berlinDayKey(date) > todayKey) : undefined
      return {
        ...t,
        dueInSalaryMonth: due.length > 0,
        autoPendingDate: upcoming?.toISOString() ?? null,
        hasInstanceInSalaryMonth: parentsWithInstance.has(t.id),
        hasUnconfirmedInstanceInSalaryMonth: instancesInSalaryMonth.some(
          (i) => i.parentTransactionId === t.id && !i.isConfirmed
        ),
      }
    })

    return NextResponse.json(enriched)
  } catch (error) {
    logger.error('Error fetching recurring transactions', error, { endpoint: '/api/transactions/recurring' })
    return NextResponse.json(
      { error: 'Fehler beim Laden der wiederkehrenden Transaktionen' },
      { status: 500 }
    )
  }
}
