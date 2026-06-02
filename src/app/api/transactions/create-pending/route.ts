import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAccountContext } from '@/lib/account-context'
import { isErrorResponse } from '@/lib/api-auth'
import { getRecurringDueDatesInRange, getSalaryMonthRange } from '@/lib/dateUtils'
import {
  createTransferPair,
  resolveTransferSenderName,
  transactionTransferInclude,
} from '@/lib/transfers'

export async function POST(_request: NextRequest) {
  try {
    const ctx = await getAccountContext()
    if (isErrorResponse(ctx)) return ctx

    const { account } = ctx

    const recurringTransactions = await prisma.transaction.findMany({
      where: {
        accountId: account.id,
        isRecurring: true,
        isRecurringPaused: false,
      },
      include: transactionTransferInclude,
    })

    const { startDate, endDate } = getSalaryMonthRange(account.salaryDay)
    const newTransactions = []

    for (const transaction of recurringTransactions) {
      const interval = transaction.recurringInterval || 'monthly'
      const dueDates = getRecurringDueDatesInRange(
        transaction.date,
        interval,
        startDate,
        endDate
      )

      for (const dueDate of dueDates) {
        const dayStart = new Date(dueDate)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(dueDate)
        dayEnd.setHours(23, 59, 59, 999)

        const existingInstance = await prisma.transaction.findFirst({
          where: {
            accountId: account.id,
            isRecurring: false,
            parentTransactionId: transaction.id,
            date: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
        })

        if (!existingInstance) {
          const newTransaction = await prisma.$transaction(async (tx) => {
            const instance = await tx.transaction.create({
              data: {
                description: transaction.description,
                merchant: transaction.merchant,
                merchantId: transaction.merchantId,
                amount: transaction.amount,
                date: dueDate,
                isConfirmed: false,
                isRecurring: false,
                accountId: account.id,
                parentTransactionId: transaction.id,
                isTransfer: transaction.isTransfer,
                transferTargetAccountId: transaction.transferTargetAccountId,
              },
            })

            if (transaction.isTransfer && transaction.transferTargetAccountId) {
              const sourceAccount = await tx.account.findUnique({
                where: { id: account.id },
                select: { name: true, transferSenderName: true },
              })
              if (sourceAccount) {
                await createTransferPair(
                  tx,
                  instance,
                  transaction.transferTargetAccountId,
                  resolveTransferSenderName(sourceAccount)
                )
              }
            }

            return tx.transaction.findUniqueOrThrow({
              where: { id: instance.id },
              include: transactionTransferInclude,
            })
          })
          newTransactions.push(newTransaction)
        }
      }
    }

    return NextResponse.json(newTransactions)
  } catch (error) {
    console.error('Error creating pending transactions:', error)
    return NextResponse.json(
      {
        error: 'Fehler beim Erstellen der ausstehenden Transaktionen',
        details: error,
      },
      { status: 500 }
    )
  }
}
