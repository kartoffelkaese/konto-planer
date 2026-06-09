import { describe, expect, it } from 'vitest'
import { parseGermanDate, formatDateIso } from './parseDate'

describe('parseGermanDate', () => {
  it('parst DD.MM.YYYY', () => {
    const d = parseGermanDate('15.03.2026')
    expect(d).not.toBeNull()
    expect(formatDateIso(d!)).toBe('2026-03-15')
  })

  it('parst DD.MM.YY', () => {
    const d = parseGermanDate('01.06.26')
    expect(formatDateIso(d!)).toBe('2026-06-01')
  })
})
