import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSalaryMonthRange } from '@/lib/dateUtils'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.email) {
      logger.warn('Dashboard: Unauthorized access attempt', {
        endpoint: '/api/dashboard'
      })
      return new NextResponse('Nicht autorisiert', { status: 401 })
    }

    // Hole den aktuellen Benutzer
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return new NextResponse('Benutzer nicht gefunden', { status: 404 })
    }

    // Hole den Gehaltsmonat
    const { startDate, endDate } = getSalaryMonthRange(user.salaryDay)

    // Berechne monatliches Einkommen
    const monthlyIncome = await prisma.transaction.aggregate({
      where: {
        userId: user.id,
        amount: {
          gt: 0
        },
        date: {
          gte: startDate,
          lte: endDate
        },
        isConfirmed: true
      },
      _sum: {
        amount: true
      }
    })

    // Berechne monatliche Ausgaben
    const monthlyExpenses = await prisma.transaction.aggregate({
      where: {
        userId: user.id,
        amount: {
          lt: 0
        },
        date: {
          gte: startDate,
          lte: endDate
        },
        isConfirmed: true
      },
      _sum: {
        amount: true
      }
    })

    // Berechne wiederkehrende Ausgaben
    const recurringExpenses = await prisma.transaction.aggregate({
      where: {
        userId: user.id,
        amount: {
          lt: 0
        },
        isRecurring: true
      },
      _sum: {
        amount: true
      }
    })

    // Berechne Gesamtbilanz
    const totalBalance = await prisma.transaction.aggregate({
      where: {
        userId: user.id
      },
      _sum: {
        amount: true
      }
    })

    // Berechne Sparrate
    const income = monthlyIncome._sum.amount?.toNumber() || 0
    const expenses = Math.abs(monthlyExpenses._sum.amount?.toNumber() || 0)
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0

    // Hole wiederkehrende Zahlungen mit Details
    const recurringTransactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        isRecurring: true,
        amount: {
          lt: 0
        }
      },
      include: {
        merchantRef: {
          include: {
            category: true
          }
        }
      }
    })

    // Berechne das nächste Zahlungsdatum für jede wiederkehrende Zahlung
    const recurringTransactionsWithNextDate = recurringTransactions.map(transaction => {
      const lastDate = transaction.lastConfirmedDate || transaction.date
      let nextDate = new Date(lastDate)

      switch (transaction.recurringInterval) {
        case 'monthly':
          nextDate.setMonth(nextDate.getMonth() + 1)
          break
        case 'quarterly':
          nextDate.setMonth(nextDate.getMonth() + 3)
          break
        case 'yearly':
          nextDate.setFullYear(nextDate.getFullYear() + 1)
          break
        default:
          nextDate = transaction.date
      }

      return {
        id: transaction.id,
        amount: Math.abs(transaction.amount.toNumber()),
        date: nextDate.toISOString(),
        category: transaction.merchantRef?.category?.name || 'Unkategorisiert',
        merchant: transaction.merchant,
        description: transaction.description
      }
    })

    // Sortiere nach dem nächsten Zahlungsdatum
    recurringTransactionsWithNextDate.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    // Filtere auf die nächsten 30 Tage
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    const upcomingTransactions = recurringTransactionsWithNextDate.filter(transaction => {
      const transactionDate = new Date(transaction.date)
      return transactionDate >= new Date() && transactionDate <= thirtyDaysFromNow
    })

    // Berechne Kategorieverteilung - Hole alle Transaktionen mit ihren Kategorien
    const transactionsWithCategories = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        amount: {
          lt: 0
        },
        date: {
          gte: startDate,
          lte: endDate
        },
        isConfirmed: true
      },
      include: {
        merchantRef: {
          include: {
            category: true
          }
        }
      }
    })

    // Gruppiere nach Kategorie und summiere die Beträge
    const categoryMap = new Map<string, { name: string; value: number; color: string }>()

    transactionsWithCategories.forEach(transaction => {
      const categoryName = transaction.merchantRef?.category?.name || 'Unkategorisiert'
      const categoryColor = transaction.merchantRef?.category?.color || '#6B7280'
      const amount = Math.abs(transaction.amount.toNumber())

      if (categoryMap.has(categoryName)) {
        const existing = categoryMap.get(categoryName)!
        existing.value += amount
      } else {
        categoryMap.set(categoryName, {
          name: categoryName,
          value: amount,
          color: categoryColor
        })
      }
    })

    // Konvertiere Map zu Array und sortiere nach Wert (absteigend)
    const kumulatedCategoryData = Array.from(categoryMap.values())
      .sort((a, b) => b.value - a.value)

    console.log('Transaktionen gefunden:', transactionsWithCategories.length)
    console.log('Kategorieverteilung:', kumulatedCategoryData)

    return NextResponse.json({
      monthlyIncome: income,
      monthlyExpenses: expenses,
      recurringExpenses: Math.abs(recurringExpenses._sum.amount?.toNumber() || 0),
      savingsRate: Math.max(0, savingsRate),
      totalBalance: totalBalance._sum.amount?.toNumber() || 0,
      recurringTransactions: upcomingTransactions,
      categoryDistribution: kumulatedCategoryData
    })
  } catch (error) {
    logger.error('Fehler beim Laden der Dashboard-Daten', error, {
      endpoint: '/api/dashboard',
      userId: (await auth())?.user?.email || 'unknown'
    })
    return new NextResponse('Interner Server-Fehler', { status: 500 })
  }
} 