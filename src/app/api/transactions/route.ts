'use server'

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSalaryMonthRange } from '@/lib/dateUtils'

export async function GET(request: Request) {
  const session = await auth()

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit
    const salaryDayParam = searchParams.get('salaryDay')
    const filterSalaryMonth = searchParams.get('filterSalaryMonth') === 'true'

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 })
    }

    // Filter für Gehaltsmonat
    let dateFilter: { gte?: Date; lte?: Date } | undefined
    if (filterSalaryMonth && salaryDayParam) {
      const salaryDay = parseInt(salaryDayParam)
      const { startDate, endDate } = getSalaryMonthRange(salaryDay)
      dateFilter = {
        gte: startDate,
        lte: endDate
      }
    }

    const whereClause: any = {
      userId: user.id
    }

    if (dateFilter) {
      whereClause.date = dateFilter
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
  const session = await auth()

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 })
    }

    const {
      merchant,
      merchantId,
      description,
      amount,
      date,
      isRecurring,
      recurringInterval
    } = await request.json()

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