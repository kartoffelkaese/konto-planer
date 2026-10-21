import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAccountContext } from '@/lib/account-context'
import { isErrorResponse } from '@/lib/api-auth'
import { resolveSalaryDay } from '@/lib/salaryDay'
import {
  resolvePeriodFromRequest,
  resolveTransactionPeriodRangeForTotals,
} from '@/lib/transactionPeriodRange'
import { logger } from '@/lib/logger'
import { getAvailableBalance, NOT_RECURRING_TEMPLATE } from '@/lib/availableBalance'

export async function GET(request: Request) {
  const ctx = await getAccountContext()
  if (isErrorResponse(ctx)) return ctx

  const { account } = ctx

  try {
    const { searchParams } = new URL(request.url)
    const salaryDay = resolveSalaryDay(
      searchParams.get('salaryDay'),
      account.salaryDay
    )
    const { period, startDate, endDate } = resolvePeriodFromRequest(searchParams)

    const periodRange = resolveTransactionPeriodRangeForTotals({
      period,
      startDate,
      endDate,
      salaryDay,
      isSimpleAccount: account.isSimpleAccount,
    })

    const currentMonthTransactions = await prisma.transaction.findMany({
      where: {
        accountId: account.id,
        date: {
          gte: periodRange.gte,
          lte: periodRange.lte,
        },
        ...NOT_RECURRING_TEMPLATE,
      },
    })

    const confirmedTransactions = await prisma.transaction.findMany({
      where: {
        accountId: account.id,
        isConfirmed: true,
        ...NOT_RECURRING_TEMPLATE,
      },
    })

    const currentIncome = currentMonthTransactions.reduce(
      (sum, t) => (Number(t.amount) > 0 ? sum + Number(t.amount) : sum),
      0
    )
    const currentExpenses = currentMonthTransactions.reduce(
      (sum, t) =>
        Number(t.amount) < 0 ? sum + Math.abs(Number(t.amount)) : sum,
      0
    )
    const totalIncome = confirmedTransactions.reduce(
      (sum, t) => (Number(t.amount) > 0 ? sum + Number(t.amount) : sum),
      0
    )
    const totalExpenses = confirmedTransactions.reduce(
      (sum, t) =>
        Number(t.amount) < 0 ? sum + Math.abs(Number(t.amount)) : sum,
      0
    )
    // Wie in der Übersicht: jede Zahlung zählt einmal (Buchung oder Prognose aus der Vorlage)
    const { clearedBalance, totalPendingExpenses, available } = await getAvailableBalance(account)

    return NextResponse.json({
      currentIncome,
      currentExpenses,
      totalIncome,
      totalExpenses,
      clearedBalance,
      totalPendingExpenses,
      available,
      periodLabel: periodRange.label,
    })
  } catch (error) {
    logger.error('Error calculating transaction totals', error, { endpoint: '/api/transactions/totals' })
    return NextResponse.json(
      { error: 'Fehler bei der Berechnung der Summen' },
      { status: 500 }
    )
  }
}
