import { describe, expect, it } from 'vitest'
import {
  findExactMerchantMatch,
  findMerchantInBankText,
  findMerchantInBankTexts,
  findSimilarMerchant,
  merchantNameSimilarity,
} from './merchantMatching'

const merchants = [
  { id: '1', name: 'Amazon' },
  { id: '2', name: 'Lidl' },
  { id: '3', name: 'REWE Markt' },
  { id: '4', name: 'Simonmobile' },
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

describe('findMerchantInBankText', () => {
  it('erkennt Simonmobile in Vodafone-Lastschrifttext', () => {
    const match = findMerchantInBankText(
      merchants,
      'Vodafone GmbH SIMon mobile'
    )
    expect(match?.merchant.name).toBe('Simonmobile')
    expect(match?.confidence).toBe('contains')
  })

  it('erkennt Lidl in Kassenbon-Text', () => {
    const match = findMerchantInBankText(
      merchants,
      'Lidl.sagt.Danke/Nuernberg'
    )
    expect(match?.merchant.name).toBe('Lidl')
    expect(match?.confidence).toBe('contains')
  })

  it('durchsucht mehrere Texte und wählt bestes Ergebnis', () => {
    const match = findMerchantInBankTexts(
      merchants,
      ['Unbekannt', 'Lidl.sagt.Danke/Nuernberg']
    )
    expect(match?.merchant.name).toBe('Lidl')
  })

  it('bevorzugt längeren Substring-Match', () => {
    const list = [
      { id: 'a', name: 'Li' },
      { id: 'b', name: 'Lidl' },
    ]
    expect(findMerchantInBankText(list, 'Lidl.sagt.Danke')?.merchant.id).toBe(
      'b'
    )
  })
})
