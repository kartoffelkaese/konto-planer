import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  getNextRecurringDueDate,
  getNextRecurringDueDateAfter,
} from '@/lib/dateUtils'
import { getAccountContext, requireWritableContext } from '@/lib/account-context'
import { isErrorResponse } from '@/lib/api-auth'
import {
  createTransferPair,
  resolveTransferSenderName,
  transactionTransferInclude,
} from '@/lib/transfers'
import { buildRecurringInstanceData } from '@/lib/recurringInstances'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const ctx = await getAccountContext()
    if (isErrorResponse(ctx)) return ctx

    const writeError = requireWritableContext(ctx)
    if (writeError) return writeError

    const { account } = ctx

    const originalTransaction = await prisma.transaction.findFirst({
      where: { id, accountId: account.id },
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
        accountId: account.id,
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

    const newTransaction = await prisma.$transaction(async (tx) => {
      const instance = await tx.transaction.create({
        data: buildRecurringInstanceData(
          originalTransaction,
          nextDueDate,
          account.id,
          originalTransaction.id
        ),
      })

      if (
        originalTransaction.isTransfer &&
        originalTransaction.transferTargetAccountId
      ) {
        const sourceAccount = await tx.account.findUnique({
          where: { id: account.id },
          select: { name: true, transferSenderName: true },
        })
        if (sourceAccount) {
          await createTransferPair(
            tx,
            instance,
            originalTransaction.transferTargetAccountId,
            resolveTransferSenderName(sourceAccount)
          )
        }
      }

      return tx.transaction.findUniqueOrThrow({
        where: { id: instance.id },
        include: transactionTransferInclude,
      })
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
