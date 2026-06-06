import type { Prisma } from '@prisma/client'

export type ResolvedCategory = {
  id: string
  name: string
  color: string
  createdAt?: string | Date
  accountId?: string
}

export const merchantCategoriesInclude = {
  categories: {
    include: {
      category: true,
    },
  },
} as const satisfies Prisma.MerchantInclude

export const transactionCategoryInclude = {
  categoryRef: true,
  merchantRef: {
    include: merchantCategoriesInclude,
  },
} as const

type MerchantWithCategories = {
  categories?: Array<{ category: ResolvedCategory }>
}

type TransactionWithCategory = {
  categoryRef?: ResolvedCategory | null
  categoryId?: string | null
  merchantRef?: MerchantWithCategories | null
}

export function resolveMerchantCategory(
  merchant: MerchantWithCategories | null | undefined
): ResolvedCategory | null {
  return merchant?.categories?.[0]?.category ?? null
}

export function resolveTransactionCategory(
  transaction: TransactionWithCategory
): ResolvedCategory | null {
  if (transaction.categoryRef) {
    return transaction.categoryRef
  }
  return resolveMerchantCategory(transaction.merchantRef)
}

export function serializeMerchant<
  T extends {
    id: string
    name: string
    accountId: string
    createdAt: Date | string
    categories?: Array<{ category: ResolvedCategory }>
  },
>(merchant: T) {
  const category = resolveMerchantCategory(merchant)
  return {
    id: merchant.id,
    name: merchant.name,
    accountId: merchant.accountId,
    createdAt: merchant.createdAt,
    categoryId: category?.id ?? null,
    category,
  }
}

export async function setMerchantCategory(
  tx: Prisma.TransactionClient,
  merchantId: string,
  categoryId: string | null | undefined
) {
  await tx.merchantCategory.deleteMany({
    where: { merchantId },
  })

  if (categoryId) {
    await tx.merchantCategory.create({
      data: { merchantId, categoryId },
    })
  }
}
