import { NextResponse } from 'next/server'
import type { Prisma, Transaction } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { assertAccountWritable } from '@/lib/api-auth'

export type TransferTarget = {
  id: string
  name: string
  role: string
}

export type TransferSyncFields = {
  amount?: number | Prisma.Decimal
  date?: Date
  isConfirmed?: boolean
}

export const transactionTransferInclude = {
  merchantRef: {
    include: {
      category: true,
    },
  },
  transferTargetAccount: {
    select: {
      id: true,
      name: true,
    },
  },
  transferPairAsSource: {
    select: {
      id: true,
      targetTransactionId: true,
    },
  },
  transferPairAsTarget: {
    select: {
      id: true,
      sourceTransaction: {
        select: {
          account: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  },
} as const

function invertAmount(amount: number | Prisma.Decimal): number {
  return -Number(amount)
}

export function resolveTransferSenderName(account: {
  transferSenderName: string | null
  name: string
}): string {
  const trimmed = account.transferSenderName?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : account.name
}

export async function getTransferTargets(
  userId: string,
  activeAccountId: string
): Promise<TransferTarget[]> {
  const memberships = await prisma.accountMember.findMany({
    where: {
      userId,
      accountId: { not: activeAccountId },
    },
    include: {
      account: {
        select: { id: true, name: true },
      },
    },
    orderBy: {
      account: { name: 'asc' },
    },
  })

  return memberships.map((membership) => ({
    id: membership.account.id,
    name: membership.account.name,
    role: membership.role,
  }))
}

export async function assertTransferTargetAllowed(
  userId: string,
  sourceAccountId: string,
  targetAccountId: string
): Promise<NextResponse | null> {
  if (sourceAccountId === targetAccountId) {
    return NextResponse.json(
      { error: 'Quell- und Zielkonto müssen unterschiedlich sein' },
      { status: 400 }
    )
  }

  const sourceError = await assertAccountWritable(userId, sourceAccountId)
  if (sourceError) return sourceError

  const targetError = await assertAccountWritable(userId, targetAccountId)
  if (targetError) return targetError

  return null
}

export async function createTransferPair(
  tx: Prisma.TransactionClient,
  sourceTransaction: Transaction,
  targetAccountId: string,
  targetIncomingMerchant: string
) {
  const source = await tx.transaction.findUniqueOrThrow({
    where: { id: sourceTransaction.id },
    select: {
      description: true,
      amount: true,
      date: true,
      isConfirmed: true,
    },
  })

  const targetTransaction = await tx.transaction.create({
    data: {
      accountId: targetAccountId,
      merchant: targetIncomingMerchant,
      description: source.description,
      amount: invertAmount(source.amount),
      date: source.date,
      isConfirmed: source.isConfirmed,
      isRecurring: false,
    },
  })

  await tx.transferPair.create({
    data: {
      sourceTransactionId: sourceTransaction.id,
      targetTransactionId: targetTransaction.id,
      targetAccountId,
    },
  })

  await tx.transaction.update({
    where: { id: sourceTransaction.id },
    data: {
      isTransfer: true,
      transferTargetAccountId: targetAccountId,
    },
  })

  return targetTransaction
}

export async function syncTransferPair(
  sourceTransactionId: string,
  fields: TransferSyncFields
) {
  const pair = await prisma.transferPair.findUnique({
    where: { sourceTransactionId },
    include: {
      targetTransaction: true,
    },
  })

  if (!pair?.targetTransaction) return

  const targetUpdate: Prisma.TransactionUpdateInput = {}

  if (fields.amount !== undefined) {
    targetUpdate.amount = invertAmount(fields.amount)
  }
  if (fields.date !== undefined) {
    targetUpdate.date = fields.date
  }
  if (fields.isConfirmed !== undefined) {
    targetUpdate.isConfirmed = fields.isConfirmed
  }

  if (Object.keys(targetUpdate).length === 0) return

  await prisma.transaction.update({
    where: { id: pair.targetTransaction.id },
    data: targetUpdate,
  })
}

export async function unlinkTransfer(sourceTransactionId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.transferPair.deleteMany({
      where: { sourceTransactionId },
    })

    await tx.transaction.update({
      where: { id: sourceTransactionId },
      data: {
        isTransfer: false,
        transferTargetAccountId: null,
        transferTargetMerchant: null,
      },
    })
  })
}

export async function unlinkTransfersTargetingAccount(accountId: string) {
  await prisma.transaction.updateMany({
    where: {
      transferTargetAccountId: accountId,
      isTransfer: true,
    },
    data: {
      isTransfer: false,
      transferTargetAccountId: null,
      transferTargetMerchant: null,
    },
  })

  await prisma.transferPair.deleteMany({
    where: { targetAccountId: accountId },
  })
}

export function isRecurringTemplate(transaction: Transaction): boolean {
  return transaction.isRecurring && !transaction.parentTransactionId
}

export function shouldCreateTransferPair(transaction: Transaction): boolean {
  return Boolean(
    transaction.isTransfer &&
      transaction.transferTargetAccountId &&
      !isRecurringTemplate(transaction)
  )
}

export async function clearTransferLinkForDeletedTarget(targetTransactionId: string) {
  const pair = await prisma.transferPair.findFirst({
    where: { targetTransactionId },
  })
  if (!pair) return

  await prisma.$transaction(async (tx) => {
    await tx.transferPair.delete({ where: { id: pair.id } })
    await tx.transaction.update({
      where: { id: pair.sourceTransactionId },
      data: {
        isTransfer: false,
        transferTargetAccountId: null,
        transferTargetMerchant: null,
      },
    })
  })
}
