import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  getNextRecurringDueDate,
  getNextRecurringDueDateAfter,
} from '@/lib/dateUtils'
import { getUserBySession, isErrorResponse } from '@/lib/api-auth'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const authResult = await getUserBySession()
    if (isErrorResponse(authResult)) return authResult

    const { user } = authResult

    const originalTransaction = await prisma.transaction.findFirst({
      where: { id, userId: user.id },
    })

    if (!originalTransaction) {
      return NextResponse.json({ error: 'Transaktion nicht gefunden' }, { status: 404 })
    }

    if (!originalTransaction.isRecurring) {
      return NextResponse.json(
        { error: 'Transaktion ist nicht wiederkehrend' },
        { status: 400 }
      )
    }

    if (originalTransaction.isRecurringPaused) {
      return NextResponse.json(
        { error: 'Wiederkehrende Zahlung ist pausiert' },
        { status: 400 }
      )
    }

    const interval = originalTransaction.recurringInterval || 'monthly'

    const lastChild = await prisma.transaction.findFirst({
      where: {
        userId: user.id,
        parentTransactionId: originalTransaction.id,
        isRecurring: false,
      },
      orderBy: { date: 'desc' },
    })

    const nextDueDate = lastChild
      ? getNextRecurringDueDateAfter(
          originalTransaction.date,
          interval,
          lastChild.date
        )
      : getNextRecurringDueDate(originalTransaction.date, interval)

    const newTransaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        description: originalTransaction.description,
        merchant: originalTransaction.merchant,
        merchantId: originalTransaction.merchantId,
        amount: originalTransaction.amount,
        date: nextDueDate,
        isConfirmed: false,
        isRecurring: false,
        parentTransactionId: originalTransaction.id,
      },
      include: {
        merchantRef: {
          include: {
            category: true,
          },
        },
      },
    })

    return NextResponse.json(newTransaction)
  } catch (error) {
    console.error('Error creating transaction instance:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
