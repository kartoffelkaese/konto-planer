import { describe, it, expect } from 'vitest'
import {
  resolveMerchantCategory,
  resolveTransactionCategory,
  serializeMerchant,
} from './merchantCategories'
import type { Category } from '@/types'

const category: Category = {
  id: 'cat-1',
  name: 'Lebensmittel',
  color: '#A8E6CF',
  createdAt: '2025-01-01',
}

describe('resolveMerchantCategory', () => {
  it('liefert erste verknüpfte Kategorie', () => {
    expect(
      resolveMerchantCategory({
        categories: [{ category }],
      })
    ).toEqual(category)
  })
})

describe('resolveTransactionCategory', () => {
  it('bevorzugt direkte Transaktions-Kategorie', () => {
    const direct: Category = {
      id: 'cat-2',
      name: 'Sonstiges',
      color: '#000',
      createdAt: '2025-01-01',
    }
    expect(
      resolveTransactionCategory({
        categoryRef: direct,
        merchantRef: { categories: [{ category }] },
      })
    ).toEqual(direct)
  })

  it('fällt auf Händler-Kategorie zurück', () => {
    expect(
      resolveTransactionCategory({
        merchantRef: { categories: [{ category }] },
      })
    ).toEqual(category)
  })
})

describe('serializeMerchant', () => {
  it('mappt categoryId für die UI', () => {
    expect(
      serializeMerchant({
        id: 'm1',
        name: 'Rewe',
        accountId: 'acc',
        createdAt: '2025-01-01',
        categories: [{ category }],
      })
    ).toMatchObject({
      categoryId: 'cat-1',
      category,
    })
  })
})
