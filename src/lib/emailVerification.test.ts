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
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    update: vi.fn(),
  },
  planChange: {
    create: vi.fn(),
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
  resetPasswordWithToken,
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
      error: 'invalid',
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
    mockPrisma.user.findUnique.mockResolvedValue({ plan: 'BASIC', planSource: null })
    const before = Date.now()
    const result = await verifyEmailToken(raw)
    expect(result).toEqual({ ok: true, purpose: EmailVerificationPurpose.SIGNUP })

    // Testphase: 14 Tage „Komplett“ ab der Bestätigung, mit Protokolleintrag
    const { data } = mockPrisma.user.update.mock.calls[0][0]
    expect(data).toMatchObject({ plan: 'FULL', planSource: 'TRIAL' })
    expect(data.emailVerified).toBeInstanceOf(Date)
    const days = (data.planExpiresAt.getTime() - before) / (24 * 60 * 60 * 1000)
    expect(days).toBeGreaterThanOrEqual(14)
    expect(days).toBeLessThan(14.01)
    expect(mockPrisma.planChange.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: 'u1', fromPlan: 'BASIC', toPlan: 'FULL', source: 'TRIAL' }),
    })
  })

  it('verifyEmailToken startet keine Testphase, wenn schon ein Level zugewiesen ist', async () => {
    const raw = 'valid-signup-legacy'
    mockPrisma.emailVerificationToken.findUnique.mockResolvedValue({
      id: 't1',
      userId: 'u1',
      purpose: EmailVerificationPurpose.SIGNUP,
      tokenHash: hashToken(raw),
      newEmail: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: { id: 'u1' },
    })
    mockPrisma.user.findUnique.mockResolvedValue({ plan: 'FULL', planSource: 'LEGACY' })
    const result = await verifyEmailToken(raw)
    expect(result).toEqual({ ok: true, purpose: EmailVerificationPurpose.SIGNUP })
    const { data } = mockPrisma.user.update.mock.calls[0][0]
    expect(data).toEqual({ emailVerified: expect.any(Date) })
    expect(mockPrisma.planChange.create).not.toHaveBeenCalled()
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
      error: 'taken',
    })
  })

  it('isEmailTaken erkennt email und pendingEmail', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ id: 'u1' })
    expect(await isEmailTaken('test@example.de')).toBe(true)
    expect(mockPrisma.user.findFirst).toHaveBeenCalled()
  })

  it('verifyEmailToken akzeptiert keinen Passwort-Reset-Token als Bestätigung', async () => {
    mockPrisma.emailVerificationToken.findUnique.mockResolvedValue({
      id: 'r1',
      userId: 'u1',
      purpose: EmailVerificationPurpose.PASSWORD_RESET,
      expiresAt: new Date(Date.now() + 60_000),
      newEmail: null,
    })
    expect(await verifyEmailToken('raw')).toEqual({ ok: false, error: 'invalid' })
    expect(mockPrisma.user.update).not.toHaveBeenCalled()
  })

  it('resetPasswordWithToken lehnt Bestätigungs-Tokens ab', async () => {
    mockPrisma.emailVerificationToken.findUnique.mockResolvedValue({
      id: 't1',
      userId: 'u1',
      purpose: EmailVerificationPurpose.SIGNUP,
      expiresAt: new Date(Date.now() + 60_000),
    })
    expect(await resetPasswordWithToken('raw', 'hash')).toEqual({ ok: false, error: 'invalid' })
    expect(mockPrisma.user.update).not.toHaveBeenCalled()
  })

  it('resetPasswordWithToken meldet abgelaufene Links', async () => {
    mockPrisma.emailVerificationToken.findUnique.mockResolvedValue({
      id: 'r1',
      userId: 'u1',
      purpose: EmailVerificationPurpose.PASSWORD_RESET,
      expiresAt: new Date(Date.now() - 1000),
    })
    expect(await resetPasswordWithToken('raw', 'hash')).toEqual({ ok: false, error: 'expired' })
    expect(mockPrisma.user.update).not.toHaveBeenCalled()
  })

  it('resetPasswordWithToken setzt das Passwort und beendet alle Sitzungen', async () => {
    const raw = 'reset-raw'
    mockPrisma.emailVerificationToken.findUnique.mockResolvedValue({
      id: 'r1',
      userId: 'u1',
      purpose: EmailVerificationPurpose.PASSWORD_RESET,
      expiresAt: new Date(Date.now() + 60_000),
    })
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({ emailVerified: new Date('2026-01-01') })

    expect(await resetPasswordWithToken(raw, 'new-hash')).toEqual({ ok: true })
    expect(mockPrisma.emailVerificationToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: hashToken(raw) },
    })
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: expect.objectContaining({
        passwordHash: 'new-hash',
        sessionVersion: { increment: 1 },
      }),
    })
    expect(mockPrisma.emailVerificationToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1', purpose: EmailVerificationPurpose.PASSWORD_RESET },
    })
  })
})
