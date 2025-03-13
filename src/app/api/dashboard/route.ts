import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSalaryMonthRange } from '@/lib/dateUtils'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
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

    // Berechne Kategorieverteilung
    const categoryDistribution = await prisma.transaction.groupBy({
      by: ['merchantId'],
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

    // Hole Kategorienamen für die Verteilung
    const categories = await prisma.category.findMany({
      where: {
        userId: user.id
      },
      select: {
        id: true,
        name: true,
        color: true
      }
    })

    // Hole Händler mit Kategorien
    const merchants = await prisma.merchant.findMany({
      where: {
        userId: user.id
      },
      select: {
        id: true,
        categoryId: true
      }
    })

    // Kombiniere Kategorieverteilung mit Kategorienamen
    const categoryData = categoryDistribution.map(dist => {
      const merchant = merchants.find(m => m.id === dist.merchantId)
      const category = categories.find(c => c.id === merchant?.categoryId)
      return {
        name: category?.name || 'Unkategorisiert',
        value: Math.abs(dist._sum.amount?.toNumber() || 0),
        color: category?.color || '#6B7280'
      }
    })

    // Kumuliere die Werte pro Kategorie
    const kumulatedCategoryData = categoryData.reduce((acc, curr) => {
      const existingCategory = acc.find(item => item.name === curr.name)
      if (existingCategory) {
        existingCategory.value += curr.value
      } else {
        acc.push(curr)
      }
      return acc
    }, [] as typeof categoryData)

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
    console.error('Fehler beim Laden der Dashboard-Daten:', error)
    return new NextResponse('Interner Server-Fehler', { status: 500 })
  }
} 