import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  getSalaryMonthRange,
  getSalaryMonthPeriodInfo,
  getNextRecurringDueDate,
  getCalendarMonthRange,
  getCalendarMonthLabel,
} from '@/lib/dateUtils'
import { logger } from '@/lib/logger'
import { getAccountContext } from '@/lib/account-context'
import { isErrorResponse } from '@/lib/api-auth'
import { transactionTransferInclude } from '@/lib/transfers'
import { resolveTransactionCategory, resolveTransactionMerchantName } from '@/lib/merchantCategories'

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

    if (account.isSimpleAccount) {
      const { startDate, endDate } = getCalendarMonthRange()
      const monthLabel = getCalendarMonthLabel()

      const [monthlyIncome, monthlyExpenses, totalBalance, recentRaw] =
        await Promise.all([
          prisma.transaction.aggregate({
            where: {
              accountId: account.id,
              amount: { gt: 0 },
              date: { gte: startDate, lte: endDate },
              isRecurring: false,
            },
            _sum: { amount: true },
          }),
          prisma.transaction.aggregate({
            where: {
              accountId: account.id,
              amount: { lt: 0 },
              date: { gte: startDate, lte: endDate },
              isRecurring: false,
            },
            _sum: { amount: true },
          }),
          prisma.transaction.aggregate({
            where: { accountId: account.id, isRecurring: false },
            _sum: { amount: true },
          }),
          prisma.transaction.findMany({
            where: { accountId: account.id, isRecurring: false },
            orderBy: { date: 'desc' },
            take: 6,
            select: {
              id: true,
              merchant: true,
              amount: true,
              date: true,
              description: true,
              merchantRef: { select: { name: true } },
            },
          }),
        ])

      const income = monthlyIncome._sum.amount?.toNumber() || 0
      const expenses = Math.abs(monthlyExpenses._sum.amount?.toNumber() || 0)

      return NextResponse.json({
        monthlyIncome: income,
        monthlyExpenses: expenses,
        totalBalance: totalBalance._sum.amount?.toNumber() || 0,
        recurringTransactions: [],
        categoryDistribution: [],
        monthLabel,
        recentTransactions: recentRaw.map((t) => ({
          id: t.id,
          merchant: resolveTransactionMerchantName(t),
          amount: t.amount.toNumber(),
          date: t.date.toISOString(),
          description: t.description,
        })),
      })
    }

    const { startDate, endDate } = getSalaryMonthRange(account.salaryDay)
    const categoryPeriod = getSalaryMonthPeriodInfo(account.salaryDay)

    const monthWhere = {
      accountId: account.id,
      date: { gte: startDate, lte: endDate },
      isConfirmed: true,
    }

    // Alle Abfragen gleichzeitig statt nacheinander (gleiche Ergebnisse, eine Datenbank-Runde)
    const [
      monthlyIncome,
      monthlyExpenses,
      totalBalance,
      recurringTransactions,
      transactionsWithCategories,
      confirmedSum,
      pendingExpenseSum,
      recentRaw,
    ] = await Promise.all([
      prisma.transaction.aggregate({
        where: { ...monthWhere, amount: { gt: 0 } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { ...monthWhere, amount: { lt: 0 } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { accountId: account.id },
        _sum: { amount: true },
      }),
      // Wiederkehrende Ausgaben mit Details
      prisma.transaction.findMany({
        where: { accountId: account.id, isRecurring: true, amount: { lt: 0 } },
        include: transactionTransferInclude,
      }),
      // Für die Kategorieverteilung: bestätigte Ausgaben im Gehaltsmonat
      prisma.transaction.findMany({
        where: { ...monthWhere, amount: { lt: 0 } },
        include: transactionTransferInclude,
      }),
      // Gebuchter Kontostand: Summe aller bestätigten Beträge (Einnahmen − Ausgaben)
      prisma.transaction.aggregate({
        where: { accountId: account.id, isConfirmed: true },
        _sum: { amount: true },
      }),
      // Offene (unbestätigte) Ausgaben
      prisma.transaction.aggregate({
        where: { accountId: account.id, isConfirmed: false, amount: { lt: 0 } },
        _sum: { amount: true },
      }),
      prisma.transaction.findMany({
        where: {
          accountId: account.id,
          isRecurring: false,
          isConfirmed: true,
        },
        orderBy: { date: 'desc' },
        take: 6,
        select: {
          id: true,
          merchant: true,
          amount: true,
          date: true,
          description: true,
          merchantRef: { select: { name: true } },
        },
      }),
    ])

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
        category: resolveTransactionCategory(transaction)?.name || 'Unkategorisiert',
        merchant: resolveTransactionMerchantName(transaction),
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

    // Gruppiere nach Kategorie und summiere die Beträge
    const categoryMap = new Map<string, { name: string; value: number; color: string }>()

    transactionsWithCategories.forEach(transaction => {
      const resolvedCategory = resolveTransactionCategory(transaction)
      const categoryName = resolvedCategory?.name || 'Unkategorisiert'
      const categoryColor = resolvedCategory?.color || 'var(--color-text-secondary)'
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

    const clearedBalance = confirmedSum._sum.amount?.toNumber() || 0
    const totalPendingExpenses = Math.abs(pendingExpenseSum._sum.amount?.toNumber() || 0)
    const available = clearedBalance - totalPendingExpenses

    const income = monthlyIncome._sum.amount?.toNumber() || 0
    const expenses = Math.abs(monthlyExpenses._sum.amount?.toNumber() || 0)

    return NextResponse.json({
      monthlyIncome: income,
      monthlyExpenses: expenses,
      totalBalance: totalBalance._sum.amount?.toNumber() || 0,
      clearedBalance,
      available,
      totalPendingExpenses,
      recurringTransactions: upcomingTransactions,
      categoryDistribution: kumulatedCategoryData,
      categoryPeriod: {
        startDate: categoryPeriod.startDate.toISOString(),
        endDate: categoryPeriod.endDate.toISOString(),
        rangeLabel: categoryPeriod.rangeLabel,
        salaryDay: account.salaryDay,
      },
      monthLabel: categoryPeriod.rangeLabel,
      recentTransactions: recentRaw.map((t) => ({
        id: t.id,
        merchant: resolveTransactionMerchantName(t),
        amount: t.amount.toNumber(),
        date: t.date.toISOString(),
        description: t.description,
      })),
    })
  } catch (error) {
    logger.error('Fehler beim Laden der Dashboard-Daten', error, {
      endpoint: '/api/dashboard',
    })
    return new NextResponse('Interner Server-Fehler', { status: 500 })
  }
} 