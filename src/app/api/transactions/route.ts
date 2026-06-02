'use server'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSalaryMonthRange } from '@/lib/dateUtils'
import { resolveSalaryDay } from '@/lib/salaryDay'
import { getAccountContext } from '@/lib/account-context'
import { isErrorResponse } from '@/lib/api-auth'
import { resolveMerchantForTransaction } from '@/lib/resolveMerchantForTransaction'
import {
  assertTransferTargetAllowed,
  createTransferPair,
  resolveTransferSenderName,
  transactionTransferInclude,
} from '@/lib/transfers'

export async function GET(request: Request) {
  const ctx = await getAccountContext()
  if (isErrorResponse(ctx)) return ctx

  const { account } = ctx

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20') || 20, 100)
    const skip = (page - 1) * limit
    const salaryDayParam = searchParams.get('salaryDay')
    const filterSalaryMonth = searchParams.get('filterSalaryMonth') === 'true'
    const search = searchParams.get('q')?.trim()

    const whereClause: {
      accountId: string
      date?: { gte: Date; lte: Date }
      OR?: Array<
        | { merchant: { contains: string } }
        | { description: { contains: string } }
      >
    } = {
      accountId: account.id,
    }

    if (filterSalaryMonth) {
      const salaryDay = resolveSalaryDay(salaryDayParam, account.salaryDay)
      const { startDate, endDate } = getSalaryMonthRange(salaryDay)
      whereClause.date = { gte: startDate, lte: endDate }
    }

    if (search && search.length > 0) {
      whereClause.OR = [
        { merchant: { contains: search } },
        { description: { contains: search } },
      ]
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: whereClause,
        include: transactionTransferInclude,
        orderBy: [
          { date: 'desc' },
          { isConfirmed: 'asc' },
        ],
        skip,
        take: limit,
      }),
      prisma.transaction.count({
        where: whereClause,
      }),
    ])

    return NextResponse.json({
      transactions,
      total,
      page,
      hasMore: skip + transactions.length < total,
    })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Transaktionen' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const ctx = await getAccountContext()
  if (isErrorResponse(ctx)) return ctx

  const { account, user } = ctx

  try {
    const body = await request.json()
    const {
      merchant,
      merchantId,
      createNewMerchant,
      description,
      amount,
      date,
      isRecurring,
      recurringInterval,
      isTransfer,
      transferTargetAccountId,
    } = body

    const resolvedMerchant = await resolveMerchantForTransaction(account.id, {
      merchantId,
      merchant,
      createNewMerchant,
    })
    if (resolvedMerchant.error) return resolvedMerchant.error

    if (isTransfer && transferTargetAccountId) {
      const transferError = await assertTransferTargetAllowed(
        user.id,
        account.id,
        transferTargetAccountId
      )
      if (transferError) return transferError

      const sourceAccount = await prisma.account.findUnique({
        where: { id: account.id },
        select: { name: true, transferSenderName: true },
      })
      if (!sourceAccount) {
        return NextResponse.json({ error: 'Konto nicht gefunden' }, { status: 404 })
      }

      const targetIncomingMerchant = resolveTransferSenderName(sourceAccount)
      const transferAmount = -Math.abs(Number(amount))
      const transactionDate = new Date(date)

      if (isRecurring) {
        const transaction = await prisma.transaction.create({
          data: {
            accountId: account.id,
            merchant: resolvedMerchant.merchant,
            merchantId: resolvedMerchant.merchantId,
            description,
            amount: transferAmount,
            date: transactionDate,
            isRecurring: true,
            recurringInterval: recurringInterval || 'monthly',
            isTransfer: true,
            transferTargetAccountId,
          },
          include: transactionTransferInclude,
        })
        return NextResponse.json(transaction)
      }

      const transaction = await prisma.$transaction(async (tx) => {
        const source = await tx.transaction.create({
          data: {
            accountId: account.id,
            merchant: resolvedMerchant.merchant,
            merchantId: resolvedMerchant.merchantId,
            description,
            amount: transferAmount,
            date: transactionDate,
            isRecurring: false,
            isTransfer: true,
            transferTargetAccountId,
          },
        })

        await createTransferPair(
          tx,
          source,
          transferTargetAccountId,
          targetIncomingMerchant
        )

        return tx.transaction.findUniqueOrThrow({
          where: { id: source.id },
          include: transactionTransferInclude,
        })
      })

      return NextResponse.json(transaction)
    }

    const transaction = await prisma.transaction.create({
      data: {
        accountId: account.id,
        merchant: resolvedMerchant.merchant,
        merchantId: resolvedMerchant.merchantId,
        description,
        amount,
        date: new Date(date),
        isRecurring: isRecurring || false,
        recurringInterval: isRecurring ? recurringInterval : null,
      },
      include: transactionTransferInclude,
    })

    return NextResponse.json(transaction)
  } catch (error) {
    console.error('Error creating transaction:', error)
    return NextResponse.json(
      { error: 'Fehler beim Erstellen der Transaktion' },
      { status: 500 }
    )
  }
}
