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
    orderBy: {
      categoryId: 'asc' as const,
    },
  },
} as const satisfies Prisma.MerchantInclude

export const transactionCategoryInclude = {
  categoryRef: true,
  merchantRef: {
    include: merchantCategoriesInclude,
  },
} as const

type MerchantCategoryLink = { category: ResolvedCategory }
type MerchantWithCategories = {
  categories?: Array<MerchantCategoryLink | ResolvedCategory>
}

type TransactionWithCategory = {
  categoryRef?: ResolvedCategory | null
  categoryId?: string | null
  merchantRef?: MerchantWithCategories | null
}

function isMerchantCategoryLink(
  item: MerchantCategoryLink | ResolvedCategory
): item is MerchantCategoryLink {
  return 'category' in item && item.category != null
}

function normalizeMerchantCategories(
  categories: MerchantWithCategories['categories']
): ResolvedCategory[] {
  if (!categories?.length) return []
  const resolved = categories.map((item) =>
    isMerchantCategoryLink(item) ? item.category : item
  )
  return [...resolved].sort((a, b) => a.id.localeCompare(b.id))
}

export function resolveMerchantCategories(
  merchant: MerchantWithCategories | null | undefined
): ResolvedCategory[] {
  return normalizeMerchantCategories(merchant?.categories)
}

/** Erste Kategorie (stabile Sortierung nach categoryId) – Fallback für Altbestand. */
export function resolveMerchantCategory(
  merchant: MerchantWithCategories | null | undefined
): ResolvedCategory | null {
  return resolveMerchantCategories(merchant)[0] ?? null
}

export function resolveTransactionCategory(
  transaction: TransactionWithCategory
): ResolvedCategory | null {
  if (transaction.categoryRef) {
    return transaction.categoryRef
  }
  return resolveMerchantCategory(transaction.merchantRef)
}

/** Statistik/Filter: nur Transaktionen, deren aufgelöste Kategorie passt. */
export function transactionBelongsToCategory(
  transaction: TransactionWithCategory,
  categoryId: string
): boolean {
  return resolveTransactionCategory(transaction)?.id === categoryId
}

export function resolveTransactionMerchantName(transaction: {
  merchant: string
  merchantRef?: { name: string } | null
}): string {
  return transaction.merchantRef?.name ?? transaction.merchant
}

export function normalizeCategoryIds(
  categoryIds?: string[] | null,
  categoryId?: string | null
): string[] {
  if (Array.isArray(categoryIds)) {
    return [...new Set(categoryIds.filter(Boolean))]
  }
  if (categoryId) {
    return [categoryId]
  }
  return []
}

export function serializeMerchant<
  T extends {
    id: string
    name: string
    accountId: string
    createdAt: Date | string
    categories?: Array<MerchantCategoryLink | ResolvedCategory>
  },
>(merchant: T) {
  const categories = resolveMerchantCategories(merchant)
  const primary = categories[0] ?? null
  return {
    id: merchant.id,
    name: merchant.name,
    accountId: merchant.accountId,
    createdAt: merchant.createdAt,
    categories,
    categoryIds: categories.map((c) => c.id),
    categoryId: primary?.id ?? null,
    category: primary,
  }
}

export async function setMerchantCategories(
  tx: Prisma.TransactionClient,
  merchantId: string,
  categoryIds: string[]
) {
  const uniqueIds = [...new Set(categoryIds.filter(Boolean))]

  await tx.merchantCategory.deleteMany({
    where: { merchantId },
  })

  if (uniqueIds.length > 0) {
    await tx.merchantCategory.createMany({
      data: uniqueIds.map((categoryId) => ({ merchantId, categoryId })),
    })
  }
}

/** @deprecated Nutze setMerchantCategories */
export async function setMerchantCategory(
  tx: Prisma.TransactionClient,
  merchantId: string,
  categoryId: string | null | undefined
) {
  await setMerchantCategories(
    tx,
    merchantId,
    categoryId ? [categoryId] : []
  )
}

export async function ensureMerchantHasCategory(
  tx: Prisma.TransactionClient,
  merchantId: string,
  categoryId: string
) {
  const existing = await tx.merchantCategory.findUnique({
    where: {
      merchantId_categoryId: { merchantId, categoryId },
    },
  })

  if (!existing) {
    await tx.merchantCategory.create({
      data: { merchantId, categoryId },
    })
  }
}

export function normalizeTransactionCategoryId(
  categoryId: unknown
): string | null | undefined {
  if (categoryId === undefined) return undefined
  if (categoryId === null || categoryId === '') return null
  return String(categoryId)
}
