import type { Category } from '@/types'

type MerchantWithCategories = {
  categoryIds?: string[]
  categories?: Category[]
}

/** Eine Händler-Kategorie → vorausfüllen; mehrere oder keine → leer. */
export function suggestCategoryIdForMerchant(
  merchant: MerchantWithCategories | null | undefined
): string {
  if (!merchant) return ''
  const ids =
    merchant.categoryIds ??
    merchant.categories?.map((category) => category.id) ??
    []
  return ids.length === 1 ? ids[0] : ''
}
