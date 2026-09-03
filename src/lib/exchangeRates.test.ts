import { describe, expect, it, vi, afterEach } from 'vitest'
import { getExchangeRateToEur, roundExchangeMoney } from '@/lib/exchangeRates'

describe('exchangeRates', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 1:1 for EUR', async () => {
    const result = await getExchangeRateToEur('EUR', new Date('2026-06-01'), 42.5)
    expect(result).toEqual({
      currency: 'EUR',
      rate: 1,
      rateDate: '2026-06-01',
      eurAmount: 42.5,
    })
  })

  it('converts foreign currency using Frankfurter API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/v2/currencies')) {
          return Promise.resolve({
            ok: true,
            json: async () => [
              { iso_code: 'EUR', name: 'Euro' },
              { iso_code: 'USD', name: 'United States Dollar' },
            ],
          })
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            date: '2026-06-01',
            base: 'USD',
            quote: 'EUR',
            rate: 0.92,
          }),
        })
      })
    )

    const result = await getExchangeRateToEur('USD', new Date('2026-06-01T12:00:00Z'), 100)
    expect(result.currency).toBe('USD')
    expect(result.rate).toBe(0.92)
    expect(result.eurAmount).toBe(92)
  })

  it('rejects unsupported currencies', async () => {
    await expect(
      getExchangeRateToEur('BTC', new Date('2026-06-01'), 1)
    ).rejects.toThrow(/nicht unterstützt/)
  })

  it('rounds money to two decimals', () => {
    expect(roundExchangeMoney(10.556)).toBe(10.56)
    expect(roundExchangeMoney(-0.004)).toBe(-0)
    expect(Object.is(roundExchangeMoney(-0.004), -0)).toBe(true)
  })
})
