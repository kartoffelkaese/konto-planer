import type { Prisma } from '@prisma/client'
import { assertCategoryOwned } from '@/lib/api-auth'
import {
  ensureMerchantHasCategory,
  normalizeTransactionCategoryId,
} from '@/lib/merchantCategories'

export async function validateTransactionCategoryId(
  categoryId: unknown,
  accountId: string
) {
  const normalized = normalizeTransactionCategoryId(categoryId)
  if (normalized === undefined || normalized === null) {
    return { categoryId: normalized, error: null as Response | null }
  }

  const categoryError = await assertCategoryOwned(normalized, accountId)
  if (categoryError) {
    return { categoryId: undefined, error: categoryError }
  }

  return { categoryId: normalized, error: null }
}

export async function applyTransactionCategoryOnSave(
  tx: Prisma.TransactionClient,
  params: {
    merchantId: string | null | undefined
    categoryId: string | null | undefined
  }
) {
  if (params.categoryId && params.merchantId) {
    await ensureMerchantHasCategory(tx, params.merchantId, params.categoryId)
  }
}
