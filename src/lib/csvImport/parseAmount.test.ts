import { describe, expect, it } from 'vitest'
import { parseGermanAmount } from './parseAmount'

describe('parseGermanAmount', () => {
  it('parst deutsche Formatierung', () => {
    expect(parseGermanAmount('1.234,56')).toBe(1234.56)
    expect(parseGermanAmount('-12,99 €')).toBe(-12.99)
    expect(parseGermanAmount('42,00')).toBe(42)
  })

  it('liefert null bei Ungültigem', () => {
    expect(parseGermanAmount('')).toBeNull()
    expect(parseGermanAmount('abc')).toBeNull()
  })
})
