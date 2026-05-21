import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  getUserBySession,
  getTransactionForUser,
  assertMerchantOwned,
  isErrorResponse,
} from '@/lib/api-auth'
const transactionInclude = {
  merchantRef: {
    include: {
      category: true,
    },
  },
} as const

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const authResult = await getUserBySession()
    if (isErrorResponse(authResult)) return authResult

    const { user } = authResult
    const transaction = await getTransactionForUser(id, user.id)
    if (isErrorResponse(transaction)) return transaction

    const full = await prisma.transaction.findUnique({
      where: { id },
      include: transactionInclude,
    })

    return NextResponse.json(full ?? transaction)
  } catch (error) {
    console.error('Error fetching transaction:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const authResult = await getUserBySession()
    if (isErrorResponse(authResult)) return authResult

    const { user } = authResult
    const existingTransaction = await getTransactionForUser(id, user.id)
    if (isErrorResponse(existingTransaction)) return existingTransaction

    const updateData = await request.json()

    if (updateData.merchantId !== undefined) {
      const merchantError = await assertMerchantOwned(
        updateData.merchantId,
        user.id
      )
      if (merchantError) return merchantError
    }

    const willBeRecurring =
      updateData.isRecurring !== undefined
        ? Boolean(updateData.isRecurring)
        : existingTransaction.isRecurring

    const allowedUpdateFields: Record<string, unknown> = {
      description: updateData.description,
      merchant: updateData.merchant,
      merchantId: updateData.merchantId,
      amount: updateData.amount,
      date: updateData.date ? new Date(updateData.date) : undefined,
      isConfirmed: updateData.isConfirmed,
      isRecurring: updateData.isRecurring,
      recurringInterval: updateData.recurringInterval,
      lastConfirmedDate:
        updateData.lastConfirmedDate !== undefined
          ? updateData.lastConfirmedDate
            ? new Date(updateData.lastConfirmedDate)
            : null
          : undefined,
    }

    if (updateData.isRecurringPaused !== undefined) {
      allowedUpdateFields.isRecurringPaused = willBeRecurring
        ? Boolean(updateData.isRecurringPaused)
        : false
    } else if (updateData.isRecurring === false) {
      allowedUpdateFields.isRecurringPaused = false
    }

    const cleanedUpdateFields = Object.fromEntries(
      Object.entries(allowedUpdateFields).filter(
        ([, value]) => value !== undefined
      )
    ) as Prisma.TransactionUpdateInput

    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: cleanedUpdateFields,
      include: transactionInclude,
    })

    if (
      cleanedUpdateFields.isConfirmed &&
      existingTransaction.parentTransactionId
    ) {
      const parent = await prisma.transaction.findFirst({
        where: {
          id: existingTransaction.parentTransactionId,
          userId: user.id,
        },
      })
      if (parent) {
        await prisma.transaction.update({
          where: { id: parent.id },
          data: {
            lastConfirmedDate: cleanedUpdateFields.lastConfirmedDate,
          },
        })
      }
    }

    return NextResponse.json(updatedTransaction)
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Transaktion:', error)
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren der Transaktion' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const authResult = await getUserBySession()
    if (isErrorResponse(authResult)) return authResult

    const { user } = authResult
    const existingTransaction = await getTransactionForUser(id, user.id)
    if (isErrorResponse(existingTransaction)) return existingTransaction

    await prisma.transaction.delete({
      where: { id },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting transaction:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
