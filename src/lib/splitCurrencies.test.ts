import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  getAllSplitCurrencies,
  getSplitCurrencyLabel,
  isSupportedSplitCurrency,
  normalizeForeignCurrencyCodes,
  refreshSplitCurrencies,
  validateForeignCurrencyCodes,
} from '@/lib/splitCurrencies'

describe('splitCurrencies', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('includes all Frankfurter fallback currencies except EUR', () => {
    const codes = getAllSplitCurrencies().map((c) => c.code)
    expect(codes).toContain('USD')
    expect(codes).toContain('CNY')
    expect(codes).toContain('AED')
    expect(codes).not.toContain('EUR')
    expect(codes.length).toBeGreaterThanOrEqual(160)
  })

  it('accepts EUR and known foreign codes', () => {
    expect(isSupportedSplitCurrency('EUR')).toBe(true)
    expect(isSupportedSplitCurrency('usd')).toBe(true)
    expect(isSupportedSplitCurrency('BTC')).toBe(false)
  })

  it('formats labels with English name and code', () => {
    expect(getSplitCurrencyLabel('USD')).toBe('United States Dollar (USD)')
    expect(getSplitCurrencyLabel('XYZ')).toBe('XYZ')
  })

  it('normalizes and validates foreign currency codes', () => {
    expect(normalizeForeignCurrencyCodes(['usd', 'USD', 'EUR', ''])).toEqual(['USD'])

    const valid = validateForeignCurrencyCodes(['USD', 'CNY'])
    expect(valid).toEqual({ ok: true, codes: ['USD', 'CNY'] })

    const invalid = validateForeignCurrencyCodes(['BTC'])
    expect(invalid.ok).toBe(false)
  })

  it('refreshes currency list from Frankfurter v2 API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { iso_code: 'EUR', name: 'Euro' },
          { iso_code: 'USD', name: 'United States Dollar' },
          { iso_code: 'CNY', name: 'Chinese Renminbi Yuan' },
        ],
      })
    )

    await refreshSplitCurrencies()

    expect(isSupportedSplitCurrency('CNY')).toBe(true)
    expect(getAllSplitCurrencies().map((c) => c.code)).toEqual(['CNY', 'USD'])
  })
})
