import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getNextDueDate, getSalaryMonthRange } from '@/lib/dateUtils'

export async function POST(request: NextRequest) {
  try {
    // Hole alle wiederkehrenden Transaktionen
    const recurringTransactions = await prisma.transaction.findMany({
      where: {
        isRecurring: true
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
            description: transaction.description,
            merchant: transaction.merchant,
            amount: transaction.amount,
            date: {
              gte: startDate,
              lte: endDate
            },
            isRecurring: false
          }
        })

        // Wenn keine Instanz existiert, erstelle eine neue
        if (!existingInstance) {
          const newTransaction = await prisma.transaction.create({
            data: {
              description: transaction.description,
              merchant: transaction.merchant,
              amount: transaction.amount,
              date: nextDueDate,
              isConfirmed: false,
              isRecurring: false,
              userId: transaction.userId
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
      { error: 'Internal Server Error', details: error },
      { status: 500 }
    )
  }
} 