import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const transactions = await prisma.transaction.findMany({
      skip,
      take: limit,
      orderBy: {
        date: 'desc'
      }
    })

    const total = await prisma.transaction.count()

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
    const body = await request.json()
    const transaction = await prisma.transaction.create({
      data: {
        description: body.description,
        amount: parseFloat(body.amount),
        date: new Date(body.date),
        isConfirmed: false,
        isRecurring: body.isRecurring,
        recurringInterval: body.isRecurring ? body.recurringInterval : null,
        userId: 'temp-user-id' // Später durch echte Benutzer-ID ersetzen
      }
    })
    return NextResponse.json(transaction)
  } catch (error) {
    console.error('Error creating transaction:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
} 