import { describe, it, expect } from 'vitest'
import {
  resolveMerchantCategory,
  resolveMerchantCategories,
  resolveTransactionCategory,
  resolveTransactionMerchantName,
  serializeMerchant,
  normalizeCategoryIds,
} from './merchantCategories'
import type { Category } from '@/types'

const categoryA: Category = {
  id: 'cat-a',
  name: 'Lebensmittel',
  color: '#A8E6CF',
  createdAt: '2025-01-01',
}

const categoryB: Category = {
  id: 'cat-b',
  name: 'Miete',
  color: '#FFD3B6',
  createdAt: '2025-01-01',
}

describe('resolveMerchantCategories', () => {
  it('liefert alle Kategorien sortiert nach id', () => {
    expect(
      resolveMerchantCategories({
        categories: [{ category: categoryB }, { category: categoryA }],
      })
    ).toEqual([categoryA, categoryB])
  })
})

describe('resolveMerchantCategory', () => {
  it('liefert erste Kategorie nach stabiler Sortierung', () => {
    expect(
      resolveMerchantCategory({
        categories: [{ category: categoryB }, { category: categoryA }],
      })
    ).toEqual(categoryA)
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
        merchantRef: { categories: [{ category: categoryA }] },
      })
    ).toEqual(direct)
  })

  it('fällt auf Händler-Kategorie zurück wenn categoryId null', () => {
    expect(
      resolveTransactionCategory({
        categoryId: null,
        categoryRef: null,
        merchantRef: { categories: [{ category: categoryB }, { category: categoryA }] },
      })
    ).toEqual(categoryA)
  })

  it('Regression: gleiche Auflösung bei mehreren Händler-Kategorien', () => {
    const merchantRef = {
      categories: [{ category: categoryB }, { category: categoryA }],
    }
    const first = resolveTransactionCategory({
      categoryId: null,
      merchantRef,
    })
    const second = resolveTransactionCategory({
      categoryId: null,
      merchantRef,
    })
    expect(first).toEqual(categoryA)
    expect(second).toEqual(first)
  })
})

describe('serializeMerchant', () => {
  it('mappt categories und categoryIds für die UI', () => {
    expect(
      serializeMerchant({
        id: 'm1',
        name: 'Peter',
        accountId: 'acc',
        createdAt: '2025-01-01',
        categories: [{ category: categoryB }, { category: categoryA }],
      })
    ).toMatchObject({
      categoryIds: ['cat-a', 'cat-b'],
      categories: [categoryA, categoryB],
      categoryId: 'cat-a',
      category: categoryA,
    })
  })
})

describe('resolveTransactionMerchantName', () => {
  it('bevorzugt merchantRef.name wenn verknüpft', () => {
    expect(
      resolveTransactionMerchantName({
        merchant: 'Alter Name',
        merchantRef: { name: 'Neuer Name' },
      })
    ).toBe('Neuer Name')
  })

  it('fällt auf merchant-String zurück ohne merchantRef', () => {
    expect(
      resolveTransactionMerchantName({
        merchant: 'Freitext-Händler',
        merchantRef: null,
      })
    ).toBe('Freitext-Händler')
  })
})

describe('normalizeCategoryIds', () => {
  it('bevorzugt categoryIds Array', () => {
    expect(normalizeCategoryIds(['a', 'b'], 'c')).toEqual(['a', 'b'])
  })

  it('wandelt einzelnes categoryId in Array um', () => {
    expect(normalizeCategoryIds(undefined, 'c')).toEqual(['c'])
  })
})
