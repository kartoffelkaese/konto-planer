import { describe, it, expect } from 'vitest'
import { getBankById, isGermanBankId, GERMAN_BANK_IDS } from './germanBanks'

describe('germanBanks', () => {
  it('enthält Trade Republic und Revolut', () => {
    expect(isGermanBankId('trade-republic')).toBe(true)
    expect(isGermanBankId('revolut')).toBe(true)
    expect(getBankById('revolut')?.name).toBe('Revolut')
    expect(getBankById('trade-republic')?.logoPath).toBe('/banks/trade-republic.svg')
  })

  it('liefert null für unbekannte IDs', () => {
    expect(getBankById('paypal')).toBeNull()
    expect(getBankById(null)).toBeNull()
  })

  it('hat eindeutige Bank-IDs', () => {
    expect(new Set(GERMAN_BANK_IDS).size).toBe(GERMAN_BANK_IDS.length)
  })
})
