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
    const resolvedParams = await Promise.resolve(params)
    console.log('Create instance API aufgerufen für ID:', resolvedParams.id)
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      console.log('Nicht autorisiert')
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Hole die ursprüngliche Transaktion
    const originalTransaction = await prisma.transaction.findUnique({
      where: { id: resolvedParams.id }
    })

    console.log('Originale Transaktion gefunden:', originalTransaction)

    if (!originalTransaction) {
      console.log('Transaktion nicht gefunden')
      return NextResponse.json(
        { error: 'Transaktion nicht gefunden' },
        { status: 404 }
      )
    }

    if (!originalTransaction.isRecurring) {
      console.log('Transaktion ist nicht wiederkehrend')
      return NextResponse.json(
        { error: 'Transaktion ist nicht wiederkehrend' },
        { status: 400 }
      )
    }

    // Berechne das nächste Fälligkeitsdatum
    const lastDate = originalTransaction.lastConfirmedDate || originalTransaction.date
    const nextDueDate = getNextDueDate(lastDate, originalTransaction.recurringInterval || 'monthly')

    console.log('Nächstes Fälligkeitsdatum berechnet:', nextDueDate)

    // Finde die höchste Version für diese wiederkehrende Zahlung
    const latestVersion = await prisma.transaction.findFirst({
      where: {
        OR: [
          { id: originalTransaction.id },
          { parentTransactionId: originalTransaction.id }
        ]
      },
      orderBy: {
        version: 'desc'
      }
    })

    const nextVersion = latestVersion ? latestVersion.version + 1 : 1

    // Erstelle eine neue Instanz der Transaktion
    const newTransaction = await prisma.transaction.create({
      data: {
        description: originalTransaction.description,
        merchant: originalTransaction.merchant,
        amount: originalTransaction.amount,
        date: nextDueDate,
        isConfirmed: false,
        isRecurring: false, // Die neue Instanz ist keine wiederkehrende Zahlung
        userId: originalTransaction.userId,
        version: nextVersion,
        parentTransactionId: originalTransaction.id
      }
    })

    console.log('Neue Transaktion erstellt:', newTransaction)

    return NextResponse.json(newTransaction)
  } catch (error) {
    console.error('Error creating transaction instance:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', details: error },
      { status: 500 }
    )
  }
} 