import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSalaryMonthRange } from '@/lib/dateUtils'
import { getAccountContext } from '@/lib/account-context'
import { isErrorResponse } from '@/lib/api-auth'
import { resolveSalaryDay } from '@/lib/salaryDay'

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

    const { startDate, endDate } = getSalaryMonthRange(salaryDay)

    const currentMonthTransactions = await prisma.transaction.findMany({
      where: {
        accountId: account.id,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    const confirmedTransactions = await prisma.transaction.findMany({
      where: {
        accountId: account.id,
        isConfirmed: true,
      },
    })

    const pendingTransactions = await prisma.transaction.findMany({
      where: {
        accountId: account.id,
        isConfirmed: false,
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
    const totalPendingExpenses = pendingTransactions.reduce(
      (sum, t) =>
        Number(t.amount) < 0 ? sum + Math.abs(Number(t.amount)) : sum,
      0
    )

    const available = totalIncome - (totalExpenses + totalPendingExpenses)

    return NextResponse.json({
      currentIncome,
      currentExpenses,
      totalIncome,
      totalExpenses,
      totalPendingExpenses,
      available,
    })
  } catch (error) {
    console.error('Error calculating transaction totals:', error)
    return NextResponse.json(
      { error: 'Fehler bei der Berechnung der Summen' },
      { status: 500 }
    )
  }
}
