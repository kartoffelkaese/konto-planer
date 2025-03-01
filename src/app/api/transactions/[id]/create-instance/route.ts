import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { getNextDueDate } from '@/lib/dateUtils'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const resolvedParams = params as { id: string }

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 })
    }

    // Hole die originale Transaktion
    const originalTransaction = await prisma.transaction.findUnique({
      where: { id: resolvedParams.id }
    })

    if (!originalTransaction) {
      return NextResponse.json({ error: 'Transaktion nicht gefunden' }, { status: 404 })
    }

    // Prüfe, ob es eine wiederkehrende Transaktion ist
    if (!originalTransaction.isRecurring) {
      return NextResponse.json(
        { error: 'Transaktion ist nicht wiederkehrend' },
        { status: 400 }
      )
    }

    // Berechne das nächste Fälligkeitsdatum
    const lastDate = originalTransaction.lastConfirmedDate || originalTransaction.date
    const nextDueDate = getNextDueDate(lastDate, originalTransaction.recurringInterval || 'monthly')

    // Erstelle eine neue Transaktion basierend auf der originalen
    const newTransaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        description: originalTransaction.description,
        merchant: originalTransaction.merchant,
        amount: originalTransaction.amount,
        date: nextDueDate,
        isConfirmed: false,
        isRecurring: false,
        parentTransactionId: originalTransaction.id
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