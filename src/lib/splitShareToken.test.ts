import { describe, expect, it } from 'vitest'
import {
  generateShareToken,
  hashShareToken,
} from '@/lib/splitShareTokenCrypto'

describe('splitShareTokenCrypto', () => {
  it('hashes tokens deterministically', () => {
    const hash = hashShareToken('test-token')
    expect(hash).toBe(hashShareToken('test-token'))
    expect(hash).not.toBe(hashShareToken('other-token'))
  })

  it('generates unique raw tokens and matching hashes', () => {
    const first = generateShareToken()
    const second = generateShareToken()
    expect(first.rawToken).not.toBe(second.rawToken)
    expect(hashShareToken(first.rawToken)).toBe(first.tokenHash)
    expect(hashShareToken(second.rawToken)).toBe(second.tokenHash)
  })
})
