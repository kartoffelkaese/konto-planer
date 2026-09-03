import { describe, expect, it } from 'vitest'
import {
  formatForeignCurrency,
  formatSplitExpenseExchangeTooltip,
  hasForeignOriginal,
} from '@/lib/splitFormatters'

describe('split foreign amount formatters', () => {
  it('detects foreign original amounts', () => {
    expect(
      hasForeignOriginal({
        originalAmount: 12,
        originalCurrencyCode: 'USD',
      })
    ).toBe(true)
    expect(
      hasForeignOriginal({
        originalAmount: null,
        originalCurrencyCode: null,
      })
    ).toBe(false)
  })

  it('formats foreign currency amounts', () => {
    expect(formatForeignCurrency(12, 'USD')).toMatch(/12/)
    expect(formatForeignCurrency(12, 'USD')).toMatch(/USD|US\$|\$/)
  })

  it('builds exchange tooltip', () => {
    const tooltip = formatSplitExpenseExchangeTooltip({
      originalCurrencyCode: 'USD',
      exchangeRate: 0.921,
      exchangeRateDate: '2026-06-01',
    })
    expect(tooltip).toContain('USD')
    expect(tooltip).toContain('2026')
  })
})
