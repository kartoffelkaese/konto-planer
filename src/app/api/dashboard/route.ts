import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  getSalaryMonthRange,
  getSalaryMonthPeriodInfo,
  getNextRecurringDueDate,
} from '@/lib/dateUtils'
import { logger } from '@/lib/logger'
import { getAccountContext } from '@/lib/account-context'
import { isErrorResponse } from '@/lib/api-auth'

export async function GET() {
  try {
    const ctx = await getAccountContext()
    if (isErrorResponse(ctx)) {
      logger.warn('Dashboard: Unauthorized access attempt', {
        endpoint: '/api/dashboard',
      })
      return ctx
    }

    const { account } = ctx

    const { startDate, endDate } = getSalaryMonthRange(account.salaryDay)
    const categoryPeriod = getSalaryMonthPeriodInfo(account.salaryDay)

    // Berechne monatliches Einkommen
    const monthlyIncome = await prisma.transaction.aggregate({
      where: {
        accountId: account.id,
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
        accountId: account.id,
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
        accountId: account.id,
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
        accountId: account.id
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
        accountId: account.id,
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
    const recurringTransactionsWithNextDate = recurringTransactions
      .filter((transaction) => !transaction.isRecurringPaused)
      .map((transaction) => {
      const nextDate = getNextRecurringDueDate(
        transaction.date,
        transaction.recurringInterval || 'monthly'
      )

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
        accountId: account.id,
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

    return NextResponse.json({
      monthlyIncome: income,
      monthlyExpenses: expenses,
      recurringExpenses: Math.abs(recurringExpenses._sum.amount?.toNumber() || 0),
      savingsRate: Math.max(0, savingsRate),
      totalBalance: totalBalance._sum.amount?.toNumber() || 0,
      recurringTransactions: upcomingTransactions,
      categoryDistribution: kumulatedCategoryData,
      categoryPeriod: {
        startDate: categoryPeriod.startDate.toISOString(),
        endDate: categoryPeriod.endDate.toISOString(),
        rangeLabel: categoryPeriod.rangeLabel,
        salaryDay: account.salaryDay,
      },
    })
  } catch (error) {
    logger.error('Fehler beim Laden der Dashboard-Daten', error, {
      endpoint: '/api/dashboard',
    })
    return new NextResponse('Interner Server-Fehler', { status: 500 })
  }
} 