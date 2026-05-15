import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserBySession, isErrorResponse } from '@/lib/api-auth'
import { getNextDueDate, getSalaryMonthRange } from '@/lib/dateUtils'

export async function POST(request: NextRequest) {
  try {
    const authResult = await getUserBySession()
    if (isErrorResponse(authResult)) return authResult

    const { user } = authResult

    // Hole alle wiederkehrenden Transaktionen des Benutzers
    const recurringTransactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        isRecurring: true
      },
      include: {
        merchantRef: {
          include: {
            category: true
          }
        }
      }
    })

    // Hole den Gehaltseingangstag aus den Einstellungen (später)
    const salaryDay = 23

    const { startDate, endDate } = getSalaryMonthRange(salaryDay)
    const newTransactions = []

    // Für jede wiederkehrende Transaktion
    for (const transaction of recurringTransactions) {
      const lastDate = transaction.lastConfirmedDate || transaction.date
      const nextDueDate = getNextDueDate(lastDate, transaction.recurringInterval || 'monthly')

      // Prüfe, ob das nächste Fälligkeitsdatum im aktuellen Gehaltsmonat liegt
      if (nextDueDate >= startDate && nextDueDate <= endDate) {
        // Prüfe, ob bereits eine Instanz für diesen Monat existiert
        const existingInstance = await prisma.transaction.findFirst({
          where: {
            userId: user.id,
            description: transaction.description,
            merchant: transaction.merchant,
            amount: transaction.amount,
            date: {
              gte: startDate,
              lte: endDate
            },
            isRecurring: false,
            parentTransactionId: transaction.id
          }
        })

        // Wenn keine Instanz existiert, erstelle eine neue
        if (!existingInstance) {
          const newTransaction = await prisma.transaction.create({
            data: {
              description: transaction.description,
              merchant: transaction.merchant,
              merchantId: transaction.merchantId,
              amount: transaction.amount,
              date: nextDueDate,
              isConfirmed: false,
              isRecurring: false,
              userId: user.id,
              parentTransactionId: transaction.id
            },
            include: {
              merchantRef: {
                include: {
                  category: true
                }
              }
            }
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