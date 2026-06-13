import { describe, expect, it } from 'vitest'
import { parseIsoDate, parseUsDate } from './parseDate'
import { parseUsAmount } from './parseAmount'

describe('parseIsoDate', () => {
  it('parst YYYY-MM-DD', () => {
    const d = parseIsoDate('2026-03-15')
    expect(d?.getFullYear()).toBe(2026)
    expect(d?.getMonth()).toBe(2)
    expect(d?.getDate()).toBe(15)
  })
})

describe('parseUsDate', () => {
  it('parst M/D/YYYY', () => {
    const d = parseUsDate('3/15/2026')
    expect(d?.getMonth()).toBe(2)
    expect(d?.getDate()).toBe(15)
  })
})

describe('parseUsAmount', () => {
  it('parst US-Beträge', () => {
    expect(parseUsAmount('1,234.56')).toBe(1234.56)
    expect(parseUsAmount('-12.99')).toBe(-12.99)
    expect(parseUsAmount('(12.99)')).toBe(-12.99)
  })
})
