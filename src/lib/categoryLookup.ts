import { prisma } from '@/lib/prisma'
import type { ResolvedCategory } from '@/lib/merchantCategories'

/**
 * Kategorien und Händler eines Kontos als Nachschlagetabellen – in einer Datenbank-Runde
 * statt einer Runde je Verknüpfungsebene (`transactionCategoryInclude` braucht vier nacheinander).
 * Ergebnis wie `resolveTransactionCategory` / `resolveTransactionMerchantName`.
 */
export type CategoryLookup = {
  categoryById: Map<string, ResolvedCategory>
  merchantById: Map<string, { name: string; categories: ResolvedCategory[] }>
}

type TransactionRefs = {
  merchant: string
  merchantId: string | null
  categoryId: string | null
}

const categorySelect = { id: true, name: true, color: true } as const

export async function loadCategoryLookup(accountId: string): Promise<CategoryLookup> {
  const [categories, merchants, links] = await Promise.all([
    prisma.category.findMany({ where: { accountId }, select: categorySelect }),
    prisma.merchant.findMany({ where: { accountId }, select: { id: true, name: true } }),
    prisma.merchantCategory.findMany({
      where: { merchant: { accountId } },
      select: { merchantId: true, categoryId: true },
    }),
  ])

  const categoryById = new Map<string, ResolvedCategory>(categories.map((c) => [c.id, c]))
  const merchantById = new Map(
    merchants.map((m) => [m.id, { name: m.name, categories: [] as ResolvedCategory[] }])
  )

  // Verknüpfte Kategorien eines anderen Kontos (sollte nicht vorkommen) gezielt nachladen
  const missing = [...new Set(links.map((l) => l.categoryId).filter((id) => !categoryById.has(id)))]
  if (missing.length > 0) {
    const extra = await prisma.category.findMany({ where: { id: { in: missing } }, select: categorySelect })
    for (const c of extra) categoryById.set(c.id, c)
  }

  for (const link of links) {
    const category = categoryById.get(link.categoryId)
    if (category) merchantById.get(link.merchantId)?.categories.push(category)
  }
  // Gleiche Reihenfolge wie resolveMerchantCategories: nach Kategorie-ID
  for (const merchant of merchantById.values()) {
    merchant.categories.sort((a, b) => a.id.localeCompare(b.id))
  }

  return { categoryById, merchantById }
}

/**
 * Lädt Kategorien und Händler nach, auf die Buchungen verweisen, die aber nicht zum Konto
 * gehören (Altbestand). Ohne solche Verweise keine weitere Abfrage.
 */
export async function completeCategoryLookup(
  lookup: CategoryLookup,
  transactions: Array<Pick<TransactionRefs, 'merchantId'> & Partial<Pick<TransactionRefs, 'categoryId'>>>
) {
  const categoryIds = new Set<string>()
  const merchantIds = new Set<string>()
  for (const t of transactions) {
    if (t.categoryId && !lookup.categoryById.has(t.categoryId)) categoryIds.add(t.categoryId)
    if (t.merchantId && !lookup.merchantById.has(t.merchantId)) merchantIds.add(t.merchantId)
  }
  if (categoryIds.size === 0 && merchantIds.size === 0) return

  const [categories, merchants] = await Promise.all([
    categoryIds.size
      ? prisma.category.findMany({ where: { id: { in: [...categoryIds] } }, select: categorySelect })
      : Promise.resolve([]),
    merchantIds.size
      ? prisma.merchant.findMany({
          where: { id: { in: [...merchantIds] } },
          select: {
            id: true,
            name: true,
            categories: { select: { category: { select: categorySelect } }, orderBy: { categoryId: 'asc' } },
          },
        })
      : Promise.resolve([]),
  ])
  for (const c of categories) lookup.categoryById.set(c.id, c)
  for (const m of merchants) {
    lookup.merchantById.set(m.id, {
      name: m.name,
      categories: m.categories.map((link) => link.category).sort((a, b) => a.id.localeCompare(b.id)),
    })
  }
}

/** Wie `resolveTransactionCategory`: eigene Kategorie, sonst die erste des Händlers */
export function lookupTransactionCategory(lookup: CategoryLookup, t: TransactionRefs): ResolvedCategory | null {
  if (t.categoryId) {
    const own = lookup.categoryById.get(t.categoryId)
    if (own) return own
  }
  return (t.merchantId ? lookup.merchantById.get(t.merchantId)?.categories[0] : undefined) ?? null
}

/** Wie `resolveTransactionMerchantName`: Name des Händlers, sonst der gespeicherte Text */
export function lookupTransactionMerchantName(
  lookup: CategoryLookup,
  t: Pick<TransactionRefs, 'merchant' | 'merchantId'>
): string {
  return (t.merchantId ? lookup.merchantById.get(t.merchantId)?.name : undefined) ?? t.merchant
}
