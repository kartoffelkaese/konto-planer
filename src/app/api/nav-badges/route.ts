import { NextResponse } from 'next/server'
import { AccountInviteStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getAccountContext } from '@/lib/account-context'
import { getUserBySession, isErrorResponse } from '@/lib/api-auth'
import { normalizeEmail } from '@/lib/accounts'
import { getSalaryMonthRange, isTransactionDueInSalaryMonth } from '@/lib/dateUtils'

export async function GET() {
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const ctx = await getAccountContext()
  if (isErrorResponse(ctx)) return ctx

  const { user } = authResult
  const { account } = ctx

  try {
    const pendingInvitations = await prisma.accountInvite.count({
      where: {
        email: normalizeEmail(user.email),
        status: AccountInviteStatus.PENDING,
      },
    })
    const { startDate, endDate } = getSalaryMonthRange(account.salaryDay)

    const unconfirmedTransactions = await prisma.transaction.count({
      where: {
        accountId: account.id,
        isConfirmed: false,
        date: { gte: startDate, lte: endDate },
      },
    })

    const recurringParents = await prisma.transaction.findMany({
      where: {
        accountId: account.id,
        isRecurring: true,
        isRecurringPaused: false,
      },
      select: {
        id: true,
        date: true,
        recurringInterval: true,
        lastConfirmedDate: true,
      },
    })

    const recurringIds = recurringParents.map((t) => t.id)
    const instancesInSalaryMonth =
      recurringIds.length > 0
        ? await prisma.transaction.findMany({
            where: {
              accountId: account.id,
              isRecurring: false,
              parentTransactionId: { in: recurringIds },
              date: { gte: startDate, lte: endDate },
            },
            select: { parentTransactionId: true },
          })
        : []

    const parentsWithInstance = new Set(
      instancesInSalaryMonth
        .map((i) => i.parentTransactionId)
        .filter((id): id is string => id != null)
    )

    let recurringAttention = 0
    for (const t of recurringParents) {
      const due = isTransactionDueInSalaryMonth(
        {
          date: t.date,
          isRecurring: true,
          isRecurringPaused: false,
          recurringInterval: t.recurringInterval,
          lastConfirmedDate: t.lastConfirmedDate,
        },
        account.salaryDay
      )
      if (due && !parentsWithInstance.has(t.id)) {
        recurringAttention += 1
      }
    }

    return NextResponse.json({
      unconfirmedTransactions,
      recurringAttention,
      pendingInvitations,
    })
  } catch (error) {
    console.error('Error fetching nav badges:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Navigationshinweise' },
      { status: 500 }
    )
  }
}
