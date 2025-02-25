import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getNextDueDate } from '@/lib/dateUtils'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Hole die ursprüngliche Transaktion
    const originalTransaction = await prisma.transaction.findUnique({
      where: { id: params.id }
    })

    if (!originalTransaction) {
      return NextResponse.json(
        { error: 'Transaktion nicht gefunden' },
        { status: 404 }
      )
    }

    if (!originalTransaction.isRecurring) {
      return NextResponse.json(
        { error: 'Transaktion ist nicht wiederkehrend' },
        { status: 400 }
      )
    }

    // Berechne das nächste Fälligkeitsdatum
    const lastDate = originalTransaction.lastConfirmedDate || originalTransaction.date
    const nextDueDate = getNextDueDate(lastDate, originalTransaction.recurringInterval || 'monthly')

    // Erstelle eine neue Instanz der Transaktion
    const newTransaction = await prisma.transaction.create({
      data: {
        description: originalTransaction.description,
        amount: originalTransaction.amount,
        date: nextDueDate,
        isConfirmed: false,
        isRecurring: false, // Die neue Instanz ist keine wiederkehrende Zahlung
        userId: originalTransaction.userId
      }
    })

    return NextResponse.json(newTransaction)
  } catch (error) {
    console.error('Error creating transaction instance:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', details: error },
      { status: 500 }
    )
  }
} 