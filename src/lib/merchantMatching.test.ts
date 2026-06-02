import { describe, expect, it } from 'vitest'
import {
  findExactMerchantMatch,
  findSimilarMerchant,
  merchantNameSimilarity,
} from './merchantMatching'

const merchants = [
  { id: '1', name: 'Amazon' },
  { id: '2', name: 'Lidl' },
  { id: '3', name: 'REWE Markt' },
]

describe('merchantNameSimilarity', () => {
  it('gibt 1 für identische Namen zurück', () => {
    expect(merchantNameSimilarity('Amazon', 'amazon')).toBe(1)
  })

  it('erkennt Tippfehler', () => {
    expect(merchantNameSimilarity('Amazn', 'Amazon')).toBeGreaterThan(0.8)
  })
})

describe('findExactMerchantMatch', () => {
  it('findet Händler unabhängig von Großschreibung', () => {
    expect(findExactMerchantMatch(merchants, 'lidl')?.id).toBe('2')
  })
})

describe('findSimilarMerchant', () => {
  it('schlägt ähnlichen Händler vor', () => {
    expect(findSimilarMerchant(merchants, 'Amazn')?.name).toBe('Amazon')
  })

  it('liefert nichts bei exaktem Treffer', () => {
    expect(findSimilarMerchant(merchants, 'Amazon')).toBeUndefined()
  })

  it('liefert nichts bei zu großer Abweichung', () => {
    expect(findSimilarMerchant(merchants, 'Netflix')).toBeUndefined()
  })
})
