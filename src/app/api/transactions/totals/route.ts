import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSalaryMonthRange } from '@/lib/dateUtils'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const salaryDay = parseInt(searchParams.get('salaryDay') || '23')
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 })
    }

    const { startDate, endDate } = getSalaryMonthRange(salaryDay)

    // Aktuelle Monatssummen
    const currentMonthTransactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    // Bestätigte Summen
    const confirmedTransactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        isConfirmed: true
      }
    })

    // Ausstehende Summen
    const pendingTransactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        isConfirmed: false
      }
    })

    // Berechne die Summen
    const currentIncome = currentMonthTransactions
      .reduce((sum, t) => Number(t.amount) > 0 ? sum + Number(t.amount) : sum, 0)
    const currentExpenses = currentMonthTransactions
      .reduce((sum, t) => Number(t.amount) < 0 ? sum + Math.abs(Number(t.amount)) : sum, 0)
    const totalIncome = confirmedTransactions
      .reduce((sum, t) => Number(t.amount) > 0 ? sum + Number(t.amount) : sum, 0)
    const totalExpenses = confirmedTransactions
      .reduce((sum, t) => Number(t.amount) < 0 ? sum + Math.abs(Number(t.amount)) : sum, 0)
    const totalPendingExpenses = pendingTransactions
      .reduce((sum, t) => Number(t.amount) < 0 ? sum + Math.abs(Number(t.amount)) : sum, 0)

    const available = totalIncome - (totalExpenses + totalPendingExpenses)

    const totals = {
      currentIncome,
      currentExpenses,
      totalIncome,
      totalExpenses,
      totalPendingExpenses,
      available
    }

    return NextResponse.json(totals)
  } catch (error) {
    console.error('Error calculating transaction totals:', error)
    return NextResponse.json(
      { error: 'Fehler bei der Berechnung der Summen' },
      { status: 500 }
    )
  }
} 