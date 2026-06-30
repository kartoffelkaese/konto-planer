import { NextResponse } from 'next/server'
import { isGermanBankId } from '@/lib/germanBanks'
import {
  isRecurringInterval,
  type RecurringIntervalId,
} from '@/lib/recurringIntervals'

import { prisma } from '@/lib/prisma'
import type { Transaction } from '@prisma/client'
import { userHasAccountAccess } from '@/lib/accounts'
import { assertCanWriteAccount } from '@/lib/accountPermissions'

export { getUserBySession } from '@/lib/account-context'

export const ACCOUNT_SETTINGS_SELECT = {
  id: true,
  name: true,
  salaryDay: true,
  bankId: true,
  isSimpleAccount: true,
  createdAt: true,
} as const

export function isErrorResponse(
  result: unknown
): result is NextResponse {
  return result instanceof NextResponse
}

export async function getTransactionForAccount(
  id: string,
  accountId: string
): Promise<Transaction | NextResponse> {
  const transaction = await prisma.transaction.findFirst({
    where: { id, accountId },
  })

  if (!transaction) {
    return NextResponse.json(
      { error: 'Transaktion nicht gefunden' },
      { status: 404 }
    )
  }

  return transaction
}

export async function assertMerchantOwned(
  merchantId: string | null | undefined,
  accountId: string
): Promise<NextResponse | null> {
  if (merchantId == null || merchantId === '') {
    return null
  }

  const merchant = await prisma.merchant.findFirst({
    where: { id: merchantId, accountId },
  })

  if (!merchant) {
    return NextResponse.json(
      { error: 'Händler nicht gefunden' },
      { status: 400 }
    )
  }

  return null
}

export async function assertCategoryOwned(
  categoryId: string | null | undefined,
  accountId: string
): Promise<NextResponse | null> {
  if (categoryId == null || categoryId === '') {
    return null
  }

  const category = await prisma.category.findFirst({
    where: { id: categoryId, accountId },
  })

  if (!category) {
    return NextResponse.json(
      { error: 'Kategorie nicht gefunden' },
      { status: 400 }
    )
  }

  return null
}

export async function assertAccountWritable(
  userId: string,
  accountId: string
): Promise<NextResponse | null> {
  const membership = await prisma.accountMember.findUnique({
    where: {
      accountId_userId: { accountId, userId },
    },
  })

  if (!membership) {
    return NextResponse.json(
      { error: 'Kein Zugriff auf Konto' },
      { status: 403 }
    )
  }

  return assertCanWriteAccount(membership)
}

export function validateSalaryDay(salaryDay: unknown): number | NextResponse {
  const day = typeof salaryDay === 'number' ? salaryDay : Number(salaryDay)
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    return NextResponse.json(
      { error: 'Der Gehaltszahlungstag muss zwischen 1 und 31 liegen' },
      { status: 400 }
    )
  }
  return day
}

export function validateAccountDisplayName(
  name: unknown
): string | null | NextResponse {
  if (name === undefined || name === null) {
    return null
  }
  if (typeof name !== 'string') {
    return NextResponse.json(
      { error: 'Ungültiger Kontoname' },
      { status: 400 }
    )
  }
  const trimmed = name.trim()
  if (trimmed.length === 0) {
    return NextResponse.json(
      { error: 'Kontoname darf nicht leer sein' },
      { status: 400 }
    )
  }
  if (trimmed.length > 100) {
    return NextResponse.json(
      { error: 'Kontoname darf maximal 100 Zeichen lang sein' },
      { status: 400 }
    )
  }
  return trimmed
}

export function validateTransferSenderName(
  name: unknown
): string | null | NextResponse {
  return validateOptionalPersonName(name, {
    invalidError: 'Ungültiger Absendername',
    tooLongError: 'Absendername darf maximal 100 Zeichen lang sein',
  })
}

export function validateSplitDisplayName(
  name: unknown
): string | null | NextResponse {
  return validateOptionalPersonName(name, {
    invalidError: 'Ungültiger Split-Anzeigename',
    tooLongError: 'Split-Anzeigename darf maximal 100 Zeichen lang sein',
  })
}

function validateOptionalPersonName(
  name: unknown,
  errors: { invalidError: string; tooLongError: string }
): string | null | NextResponse {
  if (name === undefined || name === null || name === '') {
    return null
  }
  if (typeof name !== 'string') {
    return NextResponse.json({ error: errors.invalidError }, { status: 400 })
  }
  const trimmed = name.trim()
  if (trimmed.length > 100) {
    return NextResponse.json({ error: errors.tooLongError }, { status: 400 })
  }
  return trimmed.length > 0 ? trimmed : null
}

export function validateBankId(
  bankId: unknown
): string | null | undefined | NextResponse {
  if (bankId === undefined) {
    return undefined
  }
  if (bankId === null || bankId === '') {
    return null
  }
  if (typeof bankId !== 'string') {
    return NextResponse.json(
      { error: 'Ungültige Bank' },
      { status: 400 }
    )
  }
  const trimmed = bankId.trim()
  if (!isGermanBankId(trimmed)) {
    return NextResponse.json(
      { error: 'Unbekannte Bank' },
      { status: 400 }
    )
  }
  return trimmed
}

export function validateRecurringInterval(
  interval: unknown
): RecurringIntervalId | NextResponse {
  if (interval === undefined || interval === null || interval === '') {
    return 'monthly'
  }
  if (typeof interval !== 'string' || !isRecurringInterval(interval)) {
    return NextResponse.json(
      { error: 'Ungültiges Wiederholungsintervall' },
      { status: 400 }
    )
  }
  return interval
}

/** @deprecated use validateAccountDisplayName */
export const validateAccountName = validateAccountDisplayName
