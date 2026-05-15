import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { User, Transaction } from '@prisma/client'

export const USER_PUBLIC_SELECT = {
  id: true,
  email: true,
  salaryDay: true,
  accountName: true,
  createdAt: true,
} as const

export function isErrorResponse(
  result: unknown
): result is NextResponse {
  return result instanceof NextResponse
}

export async function getUserBySession(): Promise<
  { user: User; email: string } | NextResponse
> {
  const session = await auth()

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  if (!user) {
    return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 })
  }

  return { user, email: session.user.email }
}

export async function getTransactionForUser(
  id: string,
  userId: string
): Promise<Transaction | NextResponse> {
  const transaction = await prisma.transaction.findFirst({
    where: { id, userId },
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
  userId: string
): Promise<NextResponse | null> {
  if (merchantId == null || merchantId === '') {
    return null
  }

  const merchant = await prisma.merchant.findFirst({
    where: { id: merchantId, userId },
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
  userId: string
): Promise<NextResponse | null> {
  if (categoryId == null || categoryId === '') {
    return null
  }

  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId },
  })

  if (!category) {
    return NextResponse.json(
      { error: 'Kategorie nicht gefunden' },
      { status: 400 }
    )
  }

  return null
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

export function validateAccountName(
  accountName: unknown
): string | null | NextResponse {
  if (accountName === undefined || accountName === null) {
    return null
  }
  if (typeof accountName !== 'string') {
    return NextResponse.json(
      { error: 'Ungültiger Kontoname' },
      { status: 400 }
    )
  }
  const trimmed = accountName.trim()
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
