import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAccountContext } from '@/lib/account-context'
import {
  assertCategoryOwned,
  assertMerchantOwned,
  isErrorResponse,
} from '@/lib/api-auth'
import {
  resolveTransactionCategory,
  transactionBelongsToCategory,
  transactionCategoryInclude,
} from '@/lib/merchantCategories'

export async function GET(request: Request) {
  try {
    const ctx = await getAccountContext()
    if (isErrorResponse(ctx)) return ctx

    const { account } = ctx

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const merchant = searchParams.get('merchant')
    const timeRange = searchParams.get('timeRange')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (category) {
      const categoryError = await assertCategoryOwned(category, account.id)
      if (categoryError) return categoryError
    }

    if (merchant) {
      const merchantError = await assertMerchantOwned(merchant, account.id)
      if (merchantError) return merchantError
    }

    let startDateObj: Date
    if (timeRange === 'custom' && startDate && endDate) {
      startDateObj = new Date(startDate)
    } else {
      startDateObj = new Date()
      switch (timeRange) {
        case '1month':
          startDateObj.setMonth(startDateObj.getMonth() - 1)
          break
        case '3months':
          startDateObj.setMonth(startDateObj.getMonth() - 3)
          break
        case '6months':
          startDateObj.setMonth(startDateObj.getMonth() - 6)
          break
        case '1year':
          startDateObj.setFullYear(startDateObj.getFullYear() - 1)
          break
        default:
          startDateObj.setMonth(startDateObj.getMonth() - 3)
      }
    }

    const transactionsRaw = await prisma.transaction.findMany({
      where: {
        accountId: account.id,
        ...(merchant && {
          merchantId: merchant,
        }),
        date: {
          gte: startDateObj,
        },
      },
      include: transactionCategoryInclude,
      orderBy: {
        date: 'asc',
      },
    })

    const transactions = category
      ? transactionsRaw.filter((t) => transactionBelongsToCategory(t, category))
      : transactionsRaw

    type MonthlyTotals = { income: number; expenses: number }

    const monthlyData = transactions.reduce(
      (acc: Record<string, MonthlyTotals>, transaction) => {
        const date = new Date(transaction.date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        const entry = acc[monthKey] ?? { income: 0, expenses: 0 }
        const amount = Number(transaction.amount)
        if (amount > 0) {
          entry.income += amount
        } else if (amount < 0) {
          entry.expenses += Math.abs(amount)
        }
        acc[monthKey] = entry
        return acc
      },
      {}
    )

    const selectedCategoryMeta =
      category && transactions.length > 0
        ? resolveTransactionCategory(transactions[0])
        : null

    const chartData = Object.entries(monthlyData)
      .map(([date, totals]) => ({
        date,
        income: totals.income,
        expenses: totals.expenses,
        net: totals.income - totals.expenses,
        category: selectedCategoryMeta?.name || '',
        color: selectedCategoryMeta?.color || 'var(--color-chart-default)',
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json(chartData)
  } catch (error) {
    console.error('Fehler beim Abrufen der Statistiken:', error)
    return NextResponse.json({ error: 'Interner Server-Fehler' }, { status: 500 })
  }
}
