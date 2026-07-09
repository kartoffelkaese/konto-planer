import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('@/lib/accounts', () => ({ getFirstAccountIdForUser: vi.fn() }))
vi.mock('@/lib/transfers', () => ({ resolveTransferSenderName: vi.fn() }))

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
