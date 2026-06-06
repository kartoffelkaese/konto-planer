import { describe, it, expect } from 'vitest'
import { getDuplicateBankIds } from './accountBankBadge'

describe('getDuplicateBankIds', () => {
  it('liefert Bank-IDs mit mehr als einem Konto', () => {
    const result = getDuplicateBankIds([
      { bankId: 'sparkasse' },
      { bankId: 'sparkasse' },
      { bankId: 'ing' },
      { bankId: null },
    ])
    expect(result).toEqual(new Set(['sparkasse']))
  })

  it('liefert leeres Set ohne Duplikate', () => {
    const result = getDuplicateBankIds([
      { bankId: 'sparkasse' },
      { bankId: 'ing' },
    ])
    expect(result.size).toBe(0)
  })
})
