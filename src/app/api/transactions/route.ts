import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveSalaryDay } from '@/lib/salaryDay'
import { getAccountContext, requireWritableContext } from '@/lib/account-context'
import {
  isErrorResponse,
  readJsonBody,
  validateAmount,
  validateDateInput,
  validateRecurringInterval,
} from '@/lib/api-auth'
import { resolveMerchantForTransaction } from '@/lib/resolveMerchantForTransaction'
import {
  resolvePeriodFromRequest,
  resolveTransactionPeriodRange,
} from '@/lib/transactionPeriodRange'
import {
  assertTransferTargetAllowed,
  createTransferPair,
  resolveTransferSenderName,
  transactionTransferInclude,
} from '@/lib/transfers'
import {
  applyTransactionCategoryOnSave,
  validateTransactionCategoryId,
} from '@/lib/transactionCategory'
import { assertRecurringNotAllowed } from '@/lib/simpleAccount'
import { logger } from '@/lib/logger'

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
    const search = searchParams.get('q')?.trim()
    const { period, startDate, endDate } = resolvePeriodFromRequest(searchParams)
    const salaryDay = resolveSalaryDay(salaryDayParam, account.salaryDay)

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

    const dateRange = resolveTransactionPeriodRange({
      period,
      startDate,
      endDate,
      salaryDay,
      isSimpleAccount: account.isSimpleAccount,
    })

    if (dateRange) {
      whereClause.date = { gte: dateRange.gte, lte: dateRange.lte }
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
    logger.error('Error fetching transactions', error, { endpoint: '/api/transactions' })
    return NextResponse.json(
      { error: 'Fehler beim Laden der Transaktionen' },
      { status: 500 }
    )
  }
}

/** Body von POST /api/transactions (Werte werden unten validiert) */
type TransactionPostBody = {
  merchant?: string
  merchantId?: string | null
  createNewMerchant?: boolean
  description?: string | null
  amount?: unknown
  date?: unknown
  categoryId?: unknown
  isRecurring?: boolean
  recurringInterval?: unknown
  isTransfer?: boolean
  transferTargetAccountId?: string
}

export async function POST(request: Request) {
  const ctx = await getAccountContext()
  if (isErrorResponse(ctx)) return ctx

  const writeError = requireWritableContext(ctx)
  if (writeError) return writeError

  const { account, user } = ctx

  try {
    const body = await readJsonBody<TransactionPostBody>(request)
    if (isErrorResponse(body)) return body
    const {
      merchant,
      merchantId,
      createNewMerchant,
      description,
      amount,
      date,
      categoryId: rawCategoryId,
      isRecurring,
      recurringInterval,
      isTransfer,
      transferTargetAccountId,
    } = body

    const parsedAmount = validateAmount(amount)
    if (parsedAmount instanceof NextResponse) return parsedAmount
    const parsedDate = validateDateInput(date)
    if (parsedDate instanceof NextResponse) return parsedDate
    if (parsedAmount === undefined || parsedDate === undefined) {
      return NextResponse.json(
        { error: 'Betrag und Datum sind erforderlich' },
        { status: 400 }
      )
    }

    const categoryValidation = await validateTransactionCategoryId(
      rawCategoryId,
      account.id
    )
    if (categoryValidation.error) return categoryValidation.error
    const categoryId = categoryValidation.categoryId ?? null

    if (isRecurring) {
      const planningError = assertRecurringNotAllowed(account)
      if (planningError) return planningError
    }

    const validatedRecurringInterval = isRecurring
      ? validateRecurringInterval(recurringInterval)
      : null
    if (validatedRecurringInterval instanceof NextResponse) {
      return validatedRecurringInterval
    }

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
      const transferAmount = -Math.abs(parsedAmount)
      const transactionDate = parsedDate
      const normalizedDescription =
        typeof description === 'string'
          ? description.trim() || null
          : description ?? null

      if (isRecurring) {
        const transaction = await prisma.$transaction(async (tx) => {
          const created = await tx.transaction.create({
            data: {
              accountId: account.id,
              merchant: resolvedMerchant.merchant,
              merchantId: resolvedMerchant.merchantId,
              description: normalizedDescription,
              amount: transferAmount,
              date: transactionDate,
              categoryId,
              isRecurring: true,
              recurringInterval: validatedRecurringInterval,
              isTransfer: true,
              transferTargetAccountId,
            },
          })
          await applyTransactionCategoryOnSave(tx, {
            merchantId: created.merchantId,
            categoryId: created.categoryId,
          })
          return tx.transaction.findUniqueOrThrow({
            where: { id: created.id },
            include: transactionTransferInclude,
          })
        })
        return NextResponse.json(transaction)
      }

      const transaction = await prisma.$transaction(async (tx) => {
        const source = await tx.transaction.create({
          data: {
            accountId: account.id,
            merchant: resolvedMerchant.merchant,
            merchantId: resolvedMerchant.merchantId,
            description: normalizedDescription,
            amount: transferAmount,
            date: transactionDate,
            categoryId,
            isRecurring: false,
            isTransfer: true,
            transferTargetAccountId,
          },
        })

        await applyTransactionCategoryOnSave(tx, {
          merchantId: source.merchantId,
          categoryId: source.categoryId,
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

    const transaction = await prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          accountId: account.id,
          merchant: resolvedMerchant.merchant,
          merchantId: resolvedMerchant.merchantId,
          description,
          amount: parsedAmount,
          date: parsedDate,
          categoryId,
          isRecurring: isRecurring || false,
          recurringInterval: isRecurring ? validatedRecurringInterval : null,
        },
      })

      await applyTransactionCategoryOnSave(tx, {
        merchantId: created.merchantId,
        categoryId: created.categoryId,
      })

      return tx.transaction.findUniqueOrThrow({
        where: { id: created.id },
        include: transactionTransferInclude,
      })
    })

    return NextResponse.json(transaction)
  } catch (error) {
    logger.error('Error creating transaction', error, { endpoint: '/api/transactions' })
    return NextResponse.json(
      { error: 'Fehler beim Erstellen der Transaktion' },
      { status: 500 }
    )
  }
}
