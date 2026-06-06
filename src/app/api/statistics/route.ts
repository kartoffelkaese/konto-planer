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

    const transactions = await prisma.transaction.findMany({
      where: {
        accountId: account.id,
        ...(category && {
          OR: [
            { categoryId: category },
            {
              merchantRef: {
                categories: {
                  some: { categoryId: category },
                },
              },
            },
          ],
        }),
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

    const monthlyData = transactions.reduce(
      (acc: { [key: string]: number }, transaction) => {
        const date = new Date(transaction.date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        acc[monthKey] =
          (acc[monthKey] || 0) + Math.abs(Number(transaction.amount))
        return acc
      },
      {}
    )

    const chartData = Object.entries(monthlyData).map(([date, amount]) => {
      const transaction = transactions.find((t) => {
        const tDate = new Date(t.date)
        const tMonthKey = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`
        return tMonthKey === date
      })
      const resolvedCategory = transaction
        ? resolveTransactionCategory(transaction)
        : null
      return {
        date,
        amount,
        category: resolvedCategory?.name || '',
        color: resolvedCategory?.color || '#A7C7E7',
      }
    })

    return NextResponse.json(chartData)
  } catch (error) {
    console.error('Fehler beim Abrufen der Statistiken:', error)
    return NextResponse.json({ error: 'Interner Server-Fehler' }, { status: 500 })
  }
}
