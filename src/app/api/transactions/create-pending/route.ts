import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserBySession, isErrorResponse } from '@/lib/api-auth'
import { getRecurringDueDatesInRange, getSalaryMonthRange } from '@/lib/dateUtils'

export async function POST(request: NextRequest) {
  try {
    const authResult = await getUserBySession()
    if (isErrorResponse(authResult)) return authResult

    const { user } = authResult

    // Hole alle wiederkehrenden Transaktionen des Benutzers
    const recurringTransactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        isRecurring: true,
        isRecurringPaused: false,
      },
      include: {
        merchantRef: {
          include: {
            category: true
          }
        }
      }
    })

    const { startDate, endDate } = getSalaryMonthRange(user.salaryDay)
    const newTransactions = []

    // Für jede wiederkehrende Transaktion
    for (const transaction of recurringTransactions) {
      const interval = transaction.recurringInterval || 'monthly'
      const dueDates = getRecurringDueDatesInRange(
        transaction.date,
        interval,
        startDate,
        endDate
      )

      for (const dueDate of dueDates) {
        const dayStart = new Date(dueDate)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(dueDate)
        dayEnd.setHours(23, 59, 59, 999)

        const existingInstance = await prisma.transaction.findFirst({
          where: {
            userId: user.id,
            isRecurring: false,
            parentTransactionId: transaction.id,
            date: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
        })

        if (!existingInstance) {
          const newTransaction = await prisma.transaction.create({
            data: {
              description: transaction.description,
              merchant: transaction.merchant,
              merchantId: transaction.merchantId,
              amount: transaction.amount,
              date: dueDate,
              isConfirmed: false,
              isRecurring: false,
              userId: user.id,
              parentTransactionId: transaction.id,
            },
            include: {
              merchantRef: {
                include: {
                  category: true,
                },
              },
            },
          })
          newTransactions.push(newTransaction)
        }
      }
    }

    return NextResponse.json(newTransactions)
  } catch (error) {
    console.error('Error creating pending transactions:', error)
    return NextResponse.json(
      { error: 'Fehler beim Erstellen der ausstehenden Transaktionen', details: error },
      { status: 500 }
    )
  }
} 