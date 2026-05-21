'use server'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSalaryMonthRange } from '@/lib/dateUtils'
import { resolveSalaryDay } from '@/lib/salaryDay'
import {
  getUserBySession,
  assertMerchantOwned,
  isErrorResponse,
} from '@/lib/api-auth'

export async function GET(request: Request) {
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20') || 20, 100)
    const skip = (page - 1) * limit
    const salaryDayParam = searchParams.get('salaryDay')
    const filterSalaryMonth = searchParams.get('filterSalaryMonth') === 'true'
    const search = searchParams.get('q')?.trim()

    // Filter für Gehaltsmonat
    let dateFilter: { gte?: Date; lte?: Date } | undefined
    if (filterSalaryMonth) {
      const salaryDay = resolveSalaryDay(salaryDayParam, user.salaryDay)
      const { startDate, endDate } = getSalaryMonthRange(salaryDay)
      dateFilter = {
        gte: startDate,
        lte: endDate
      }
    }

    const whereClause: {
      userId: string
      date?: { gte: Date; lte: Date }
      OR?: Array<
        | { merchant: { contains: string } }
        | { description: { contains: string } }
      >
    } = {
      userId: user.id
    }

    if (dateFilter) {
      whereClause.date = dateFilter
    }

    if (search && search.length > 0) {
      whereClause.OR = [
        { merchant: { contains: search } },
        { description: { contains: search } },
      ]
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: whereClause,
        include: {
          merchantRef: {
            include: {
              category: true
            }
          }
        },
        orderBy: [
          {
            date: 'desc'
          },
          {
            isConfirmed: 'asc'
          }
        ],
        skip,
        take: limit
      }),
      prisma.transaction.count({
        where: whereClause
      })
    ])

    return NextResponse.json({
      transactions,
      total,
      page,
      hasMore: skip + transactions.length < total
    })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Transaktionen' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult

  try {
    const {
      merchant,
      merchantId,
      description,
      amount,
      date,
      isRecurring,
      recurringInterval
    } = await request.json()

    const merchantError = await assertMerchantOwned(merchantId, user.id)
    if (merchantError) return merchantError

    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        merchant,
        merchantId,
        description,
        amount,
        date: new Date(date),
        isRecurring: isRecurring || false,
        recurringInterval: isRecurring ? recurringInterval : null
      },
      include: {
        merchantRef: {
          include: {
            category: true
          }
        }
      }
    })

    return NextResponse.json(transaction)
  } catch (error) {
    console.error('Error creating transaction:', error)
    return NextResponse.json(
      { error: 'Fehler beim Erstellen der Transaktion' },
      { status: 500 }
    )
  }
} 