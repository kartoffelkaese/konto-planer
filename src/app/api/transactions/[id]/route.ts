import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getAccountContext, requireWritableContext } from '@/lib/account-context'
import {
  getTransactionForAccount,
  assertMerchantOwned,
  isErrorResponse,
} from '@/lib/api-auth'
import { resolveMerchantForTransaction } from '@/lib/resolveMerchantForTransaction'
import {
  assertTransferTargetAllowed,
  clearTransferLinkForDeletedTarget,
  createTransferPair,
  isRecurringTemplate,
  resolveTransferSenderName,
  shouldCreateTransferPair,
  syncTransferPair,
  transactionTransferInclude,
  unlinkTransfer,
} from '@/lib/transfers'
import { syncUnconfirmedRecurringInstanceAmounts } from '@/lib/recurringSync'
import {
  applyTransactionCategoryOnSave,
  validateTransactionCategoryId,
} from '@/lib/transactionCategory'
import { assertRecurringNotAllowed } from '@/lib/simpleAccount'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const ctx = await getAccountContext()
    if (isErrorResponse(ctx)) return ctx

    const { account } = ctx
    const transaction = await getTransactionForAccount(id, account.id)
    if (isErrorResponse(transaction)) return transaction

    const full = await prisma.transaction.findUnique({
      where: { id },
      include: transactionTransferInclude,
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
    const ctx = await getAccountContext()
    if (isErrorResponse(ctx)) return ctx

    const writeError = requireWritableContext(ctx)
    if (writeError) return writeError

    const { account, user } = ctx
    const existingTransaction = await getTransactionForAccount(id, account.id)
    if (isErrorResponse(existingTransaction)) return existingTransaction

    const updateData = await request.json()

    if (account.isSimpleAccount) {
      if (updateData.isRecurring === true) {
        const planningError = assertRecurringNotAllowed(account)
        if (planningError) return planningError
      }
      if (updateData.isRecurringPaused !== undefined) {
        const planningError = assertRecurringNotAllowed(account)
        if (planningError) return planningError
      }
      if (
        updateData.recurringInterval !== undefined &&
        updateData.isRecurring !== false
      ) {
        const planningError = assertRecurringNotAllowed(account)
        if (planningError) return planningError
      }
    }

    const wantsTransfer =
      updateData.isTransfer !== undefined
        ? Boolean(updateData.isTransfer)
        : existingTransaction.isTransfer

    const targetAccountId =
      updateData.transferTargetAccountId !== undefined
        ? updateData.transferTargetAccountId
        : existingTransaction.transferTargetAccountId

    // Berechtigung prüfen, bevor bestehende Verknüpfungen verändert werden
    if (wantsTransfer && targetAccountId) {
      const transferError = await assertTransferTargetAllowed(
        user.id,
        account.id,
        targetAccountId
      )
      if (transferError) return transferError
    }

    if (updateData.isTransfer === false && existingTransaction.isTransfer) {
      await unlinkTransfer(id)
    }

    if (
      wantsTransfer &&
      targetAccountId &&
      existingTransaction.transferTargetAccountId &&
      existingTransaction.transferTargetAccountId !== targetAccountId
    ) {
      await unlinkTransfer(id)
    }

    if (updateData.merchantId !== undefined || updateData.merchant !== undefined) {
      if (!wantsTransfer) {
        const merchantError = await assertMerchantOwned(
          updateData.merchantId,
          account.id
        )
        if (merchantError) return merchantError
      }
    }

    const willBeRecurring =
      updateData.isRecurring !== undefined
        ? Boolean(updateData.isRecurring)
        : existingTransaction.isRecurring

    const sourceAccount = await prisma.account.findUnique({
      where: { id: account.id },
      select: { name: true, transferSenderName: true },
    })
    const targetIncomingMerchant = sourceAccount
      ? resolveTransferSenderName(sourceAccount)
      : account.name

    const allowedUpdateFields: Record<string, unknown> = {
      description: updateData.description,
      amount:
        updateData.amount !== undefined
          ? wantsTransfer
            ? -Math.abs(Number(updateData.amount))
            : updateData.amount
          : undefined,
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

    if (
      updateData.isTransfer !== undefined ||
      updateData.transferTargetAccountId !== undefined
    ) {
      allowedUpdateFields.isTransfer = wantsTransfer
      allowedUpdateFields.transferTargetAccountId = wantsTransfer
        ? targetAccountId
        : null
    }

    if (
      updateData.merchant !== undefined ||
      updateData.merchantId !== undefined ||
      updateData.createNewMerchant !== undefined
    ) {
      const resolvedMerchant = await resolveMerchantForTransaction(account.id, {
        merchantId:
          updateData.merchantId !== undefined
            ? updateData.merchantId
            : updateData.merchant !== undefined
              ? null
              : existingTransaction.merchantId,
        merchant:
          updateData.merchant !== undefined
            ? updateData.merchant
            : existingTransaction.merchant,
        createNewMerchant: updateData.createNewMerchant,
      })
      if (resolvedMerchant.error) return resolvedMerchant.error
      allowedUpdateFields.merchant = resolvedMerchant.merchant
      allowedUpdateFields.merchantId = resolvedMerchant.merchantId
    }

    if (updateData.isRecurringPaused !== undefined) {
      allowedUpdateFields.isRecurringPaused = willBeRecurring
        ? Boolean(updateData.isRecurringPaused)
        : false
    } else if (updateData.isRecurring === false) {
      allowedUpdateFields.isRecurringPaused = false
    }

    if (updateData.categoryId !== undefined) {
      const categoryValidation = await validateTransactionCategoryId(
        updateData.categoryId,
        account.id
      )
      if (categoryValidation.error) return categoryValidation.error
      allowedUpdateFields.categoryId = categoryValidation.categoryId ?? null
    }

    const cleanedUpdateFields = Object.fromEntries(
      Object.entries(allowedUpdateFields).filter(
        ([, value]) => value !== undefined
      )
    ) as Prisma.TransactionUpdateInput

    const updatedTransaction = await prisma.$transaction(async (tx) => {
      const updated = await tx.transaction.update({
        where: { id },
        data: cleanedUpdateFields,
        include: transactionTransferInclude,
      })

      if (updateData.categoryId !== undefined && updated.categoryId && updated.merchantId) {
        await applyTransactionCategoryOnSave(tx, {
          merchantId: updated.merchantId,
          categoryId: updated.categoryId,
        })
      }

      return updated
    })

    if (
      isRecurringTemplate(updatedTransaction) &&
      updateData.amount !== undefined &&
      Number(existingTransaction.amount) !== Number(updatedTransaction.amount)
    ) {
      await syncUnconfirmedRecurringInstanceAmounts(
        id,
        updatedTransaction.amount
      )
    }

    if (
      shouldCreateTransferPair(updatedTransaction) &&
      !updatedTransaction.transferPairAsSource
    ) {
      if (targetAccountId) {
        await prisma.$transaction(async (tx) => {
          await createTransferPair(
            tx,
            updatedTransaction,
            targetAccountId,
            targetIncomingMerchant
          )
        })
      }
    }

    const syncFields: {
      amount?: number
      date?: Date
      isConfirmed?: boolean
    } = {}

    if (updateData.amount !== undefined) syncFields.amount = Number(updateData.amount)
    if (updateData.date !== undefined) syncFields.date = new Date(updateData.date)
    if (updateData.isConfirmed !== undefined) syncFields.isConfirmed = updateData.isConfirmed

    if (
      updatedTransaction.isTransfer &&
      !isRecurringTemplate(updatedTransaction) &&
      Object.keys(syncFields).length > 0
    ) {
      await syncTransferPair(id, syncFields)
    }

    const finalTransaction = await prisma.transaction.findUnique({
      where: { id },
      include: transactionTransferInclude,
    })

    if (
      cleanedUpdateFields.isConfirmed &&
      existingTransaction.parentTransactionId
    ) {
      const parent = await prisma.transaction.findFirst({
        where: {
          id: existingTransaction.parentTransactionId,
          accountId: account.id,
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

    return NextResponse.json(finalTransaction ?? updatedTransaction)
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
    const ctx = await getAccountContext()
    if (isErrorResponse(ctx)) return ctx

    const writeError = requireWritableContext(ctx)
    if (writeError) return writeError

    const { account } = ctx
    const existingTransaction = await getTransactionForAccount(id, account.id)
    if (isErrorResponse(existingTransaction)) return existingTransaction

    await clearTransferLinkForDeletedTarget(id)

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
