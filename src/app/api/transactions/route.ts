import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { Decimal } from '@prisma/client/runtime/library'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id
      },
      skip,
      take: limit,
      orderBy: {
        date: 'desc'
      }
    })

    const total = await prisma.transaction.count({
      where: {
        userId: session.user.id
      }
    })

    return NextResponse.json({
      transactions,
      total,
      hasMore: skip + limit < total
    })
  } catch (error) {
    console.error('Fehler beim Laden der Transaktionen:', error)
    return new NextResponse('Interner Serverfehler', { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const body = await request.json()
    
    // Validiere die erforderlichen Felder
    if (!body.merchant || !body.amount || !body.date) {
      return NextResponse.json(
        { error: 'Merchant, amount und date sind erforderlich' },
        { status: 400 }
      )
    }

    // Stelle sicher, dass amount eine gültige Zahl ist
    const amount = typeof body.amount === 'string' 
      ? new Decimal(body.amount)
      : new Decimal(body.amount.toString())

    const transaction = await prisma.transaction.create({
      data: {
        description: body.description || null,
        merchant: body.merchant,
        amount: amount,
        date: new Date(body.date),
        isConfirmed: body.isConfirmed ?? false,
        isRecurring: body.isRecurring ?? false,
        recurringInterval: body.isRecurring ? body.recurringInterval : null,
        lastConfirmedDate: body.lastConfirmedDate ? new Date(body.lastConfirmedDate) : null,
        version: 1,
        parentTransactionId: body.parentTransactionId || null,
        userId: session.user.id
      }
    })

    return NextResponse.json(transaction)
  } catch (error) {
    console.error('Error creating transaction:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 