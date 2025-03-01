'use server'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 })
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          userId: user.id
        },
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
        where: {
          userId: user.id
        }
      })
    ])

    console.log('Geladene Transaktionen:', JSON.stringify(transactions, null, 2))
    console.log('Erste Transaktion MerchantRef:', transactions[0]?.merchantRef)
    console.log('Erste Transaktion MerchantRef Category:', transactions[0]?.merchantRef?.category)

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
  const session = await getServerSession(authOptions)

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