import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { assertMerchantOwned } from '@/lib/api-auth'
import { findExactMerchantMatch } from '@/lib/merchantMatching'

export type ResolveMerchantResult =
  | { merchantId: string; merchant: string; error?: undefined }
  | { merchantId?: undefined; merchant?: undefined; error: NextResponse }

export async function resolveMerchantForTransaction(
  accountId: string,
  options: {
    merchantId?: string | null
    merchant?: string | null
    createNewMerchant?: boolean
  }
): Promise<ResolveMerchantResult> {
  if (options.merchantId) {
    const merchantError = await assertMerchantOwned(options.merchantId, accountId)
    if (merchantError) {
      return { error: merchantError }
    }

    const existing = await prisma.merchant.findFirst({
      where: { id: options.merchantId, accountId },
      select: { id: true, name: true },
    })

    if (!existing) {
      return {
        error: NextResponse.json({ error: 'Händler nicht gefunden' }, { status: 404 }),
      }
    }

    return { merchantId: existing.id, merchant: existing.name }
  }

  const trimmedName = options.merchant?.trim()
  if (!trimmedName) {
    return {
      error: NextResponse.json({ error: 'Händler ist erforderlich' }, { status: 400 }),
    }
  }

  if (!options.createNewMerchant) {
    const accountMerchants = await prisma.merchant.findMany({
      where: { accountId },
      select: { id: true, name: true },
    })
    const exact = findExactMerchantMatch(accountMerchants, trimmedName)
    if (exact) {
      return { merchantId: exact.id, merchant: exact.name }
    }
  }

  try {
    const created = await prisma.merchant.create({
      data: {
        accountId,
        name: trimmedName,
      },
    })
    return { merchantId: created.id, merchant: created.name }
  } catch (error) {
    const isUniqueViolation =
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'

    if (isUniqueViolation) {
      const existing = await prisma.merchant.findFirst({
        where: { accountId, name: trimmedName },
        select: { id: true, name: true },
      })
      if (existing) {
        return { merchantId: existing.id, merchant: existing.name }
      }
    }

    throw error
  }
}
