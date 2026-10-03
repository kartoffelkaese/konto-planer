import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAccountContext, requireWritableContext } from '@/lib/account-context'
import { isErrorResponse } from '@/lib/api-auth'
import { assertPlanningAccount } from '@/lib/simpleAccount'
import { getRecurringDueDatesInRange, getSalaryMonthRange } from '@/lib/dateUtils'
import { buildRecurringInstanceData, recurringInstanceKey as instanceKey } from '@/lib/recurringInstances'
import {
  createTransferPair,
  resolveTransferSenderName,
  transactionTransferInclude,
} from '@/lib/transfers'
import { logger } from '@/lib/logger'

export async function POST() {
  try {
    const ctx = await getAccountContext()
    if (isErrorResponse(ctx)) return ctx

    const writeError = requireWritableContext(ctx)
    if (writeError) return writeError

    const { account } = ctx

    const planningError = assertPlanningAccount(account)
    if (planningError) return planningError

    const recurringTransactions = await prisma.transaction.findMany({
      where: {
        accountId: account.id,
        isRecurring: true,
        isRecurringPaused: false,
      },
      include: transactionTransferInclude,
    })

    const { startDate, endDate } = getSalaryMonthRange(account.salaryDay)

    const dueByTemplate = recurringTransactions.map((transaction) => ({
      transaction,
      dueDates: getRecurringDueDatesInRange(
        transaction.date,
        transaction.recurringInterval || 'monthly',
        startDate,
        endDate
      ),
    }))
    const allDueDates = dueByTemplate.flatMap(({ dueDates }) => dueDates)

    // Vorhandene Instanzen aller Vorlagen in einer Abfrage statt einer je Fälligkeit
    const existingKeys = new Set<string>()
    if (allDueDates.length > 0) {
      const rangeStart = new Date(Math.min(...allDueDates.map((d) => d.getTime())))
      rangeStart.setHours(0, 0, 0, 0)
      const rangeEnd = new Date(Math.max(...allDueDates.map((d) => d.getTime())))
      rangeEnd.setHours(23, 59, 59, 999)

      const existingInstances = await prisma.transaction.findMany({
        where: {
          accountId: account.id,
          isRecurring: false,
          parentTransactionId: { in: recurringTransactions.map((t) => t.id) },
          date: { gte: rangeStart, lte: rangeEnd },
        },
        select: { parentTransactionId: true, date: true },
      })
      for (const instance of existingInstances) {
        if (instance.parentTransactionId) {
          existingKeys.add(instanceKey(instance.parentTransactionId, instance.date))
        }
      }
    }

    const newTransactions = []

    for (const { transaction, dueDates } of dueByTemplate) {
      for (const dueDate of dueDates) {
        const key = instanceKey(transaction.id, dueDate)
        if (existingKeys.has(key)) continue

        const newTransaction = await prisma.$transaction(async (tx) => {
          const instance = await tx.transaction.create({
            data: buildRecurringInstanceData(
              transaction,
              dueDate,
              account.id,
              transaction.id
            ),
          })

          if (transaction.isTransfer && transaction.transferTargetAccountId) {
            await createTransferPair(
              tx,
              instance,
              transaction.transferTargetAccountId,
              resolveTransferSenderName(account)
            )
          }

          return tx.transaction.findUniqueOrThrow({
            where: { id: instance.id },
            include: transactionTransferInclude,
          })
        })
        existingKeys.add(key)
        newTransactions.push(newTransaction)
      }
    }

    return NextResponse.json(newTransactions)
  } catch (error) {
    logger.error('Error creating pending transactions', error, { endpoint: '/api/transactions/create-pending' })
    return NextResponse.json(
      {
        error: 'Fehler beim Erstellen der ausstehenden Transaktionen',
      },
      { status: 500 }
    )
  }
}
