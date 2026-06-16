import { describe, expect, it } from 'vitest'
import { dedupeDisplayNameAgainst } from '@/lib/splitUserDisplayName'

describe('dedupeDisplayNameAgainst', () => {
  it('gibt Basisnamen zurück wenn frei', () => {
    expect(dedupeDisplayNameAgainst('Martin', ['Anna'])).toBe('Martin')
  })

  it('hängt Suffix an bei Kollision', () => {
    expect(dedupeDisplayNameAgainst('Martin', ['Martin', 'Martin (2)'])).toBe(
      'Martin (3)'
    )
  })
})
