import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSalaryMonthRange } from '@/lib/dateUtils'
import { getUserBySession, isErrorResponse } from '@/lib/api-auth'
import { resolveSalaryDay } from '@/lib/salaryDay'

export async function GET(request: Request) {
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult

  try {
    const { searchParams } = new URL(request.url)
    const salaryDay = resolveSalaryDay(
      searchParams.get('salaryDay'),
      user.salaryDay
    )

    const { startDate, endDate } = getSalaryMonthRange(salaryDay)

    const currentMonthTransactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    const confirmedTransactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        isConfirmed: true,
      },
    })

    const pendingTransactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
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
