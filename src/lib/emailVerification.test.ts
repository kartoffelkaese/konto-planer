import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHash } from 'crypto'
import { EmailVerificationPurpose } from '@prisma/client'

const mockPrisma = vi.hoisted(() => ({
  emailVerificationToken: {
    deleteMany: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    delete: vi.fn(),
  },
  user: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(),
  getAuthBaseUrl: () => 'http://localhost:3000',
}))

import {
  verifyEmailToken,
  isEmailTaken,
  EMAIL_VERIFICATION_TTL_MS,
} from './emailVerification'

function hashToken(raw: string) {
  return createHash('sha256').update(raw).digest('hex')
}

describe('emailVerification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.$transaction.mockImplementation(
      async (fn: (tx: typeof mockPrisma) => Promise<void>) => fn(mockPrisma)
    )
  })

  it('EMAIL_VERIFICATION_TTL_MS ist 24 Stunden', () => {
    expect(EMAIL_VERIFICATION_TTL_MS).toBe(24 * 60 * 60 * 1000)
  })

  it('verifyEmailToken lehnt unbekannten Token ab', async () => {
    mockPrisma.emailVerificationToken.findUnique.mockResolvedValue(null)
    const result = await verifyEmailToken('unknown')
    expect(result).toEqual({
      ok: false,
      error: 'Ungültiger oder abgelaufener Link.',
    })
  })

  it('verifyEmailToken lehnt abgelaufenen Token ab', async () => {
    const raw = 'expired-token'
    mockPrisma.emailVerificationToken.findUnique.mockResolvedValue({
      id: 't1',
      userId: 'u1',
      purpose: EmailVerificationPurpose.SIGNUP,
      tokenHash: hashToken(raw),
      newEmail: null,
      expiresAt: new Date(Date.now() - 1000),
      user: { id: 'u1' },
    })
    const result = await verifyEmailToken(raw)
    expect(result.ok).toBe(false)
    expect(mockPrisma.emailVerificationToken.delete).toHaveBeenCalled()
  })

  it('verifyEmailToken bestätigt SIGNUP', async () => {
    const raw = 'valid-signup'
    mockPrisma.emailVerificationToken.findUnique.mockResolvedValue({
      id: 't1',
      userId: 'u1',
      purpose: EmailVerificationPurpose.SIGNUP,
      tokenHash: hashToken(raw),
      newEmail: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: { id: 'u1' },
    })
    const result = await verifyEmailToken(raw)
    expect(result).toEqual({ ok: true, purpose: EmailVerificationPurpose.SIGNUP })
    expect(mockPrisma.user.update).toHaveBeenCalled()
  })

  it('verifyEmailToken prüft Eindeutigkeit bei EMAIL_CHANGE', async () => {
    const raw = 'valid-change'
    mockPrisma.emailVerificationToken.findUnique.mockResolvedValue({
      id: 't2',
      userId: 'u1',
      purpose: EmailVerificationPurpose.EMAIL_CHANGE,
      tokenHash: hashToken(raw),
      newEmail: 'neu@example.de',
      expiresAt: new Date(Date.now() + 60_000),
      user: { id: 'u1' },
    })
    mockPrisma.user.findFirst.mockResolvedValue({ id: 'other' })
    const result = await verifyEmailToken(raw)
    expect(result).toEqual({
      ok: false,
      error: 'Diese E-Mail-Adresse wird bereits verwendet.',
    })
  })

  it('isEmailTaken erkennt email und pendingEmail', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ id: 'u1' })
    expect(await isEmailTaken('test@example.de')).toBe(true)
    expect(mockPrisma.user.findFirst).toHaveBeenCalled()
  })
})
