import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', async () => (await import('@/test/routeHarness')).prismaModule)
vi.mock('@/lib/auth', async () => (await import('@/test/routeHarness')).authModule)
vi.mock('@/lib/emailVerification', () => ({
  createVerificationToken: vi.fn(async () => 'token'),
  sendPasswordResetEmail: vi.fn(async () => undefined),
  sendSignupVerificationEmail: vi.fn(async () => undefined),
  sendEmailChangeVerificationEmail: vi.fn(async () => undefined),
}))
vi.mock('@/lib/cleanupUnverifiedUsers', () => ({ cleanupUnverifiedUsers: vi.fn(async () => undefined) }))

import * as forgotPasswordRoute from '@/app/api/auth/forgot-password/route'
import * as resendVerificationRoute from '@/app/api/auth/resend-verification/route'
import * as emailResendRoute from '@/app/api/users/email/resend/route'
import { NextRequest } from 'next/server'
import { checkMailCooldown } from '@/lib/rate-limit'
import {
  sendEmailChangeVerificationEmail,
  sendPasswordResetEmail,
  sendSignupVerificationEmail,
} from '@/lib/emailVerification'
import { jsonRequest, loginAs, prismaMock, resetRouteMocks } from '@/test/routeHarness'

let counter = 0
let email = ''
const request = (address = email) =>
  forgotPasswordRoute.POST(jsonRequest('POST', { email: address }, 'http://localhost/api/auth/forgot-password'))

beforeEach(() => {
  resetRouteMocks()
  vi.mocked(sendPasswordResetEmail).mockClear()
  vi.mocked(sendSignupVerificationEmail).mockClear()
  vi.mocked(sendEmailChangeVerificationEmail).mockClear()
  // Eigene Adresse je Test, damit sich die Sperren nicht in die Quere kommen
  counter += 1
  email = `reset-${counter}@example.com`
  prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1' })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('POST /api/auth/forgot-password – Mindestabstand', () => {
  it('erneute Anfrage innerhalb einer Minute: 429 mit Restzeit, keine zweite Mail', async () => {
    expect((await request()).status).toBe(200)
    const second = await request()
    expect(second.status).toBe(429)
    const body = await second.json()
    expect(body.retryAfterSec).toBeGreaterThan(0)
    expect(body.retryAfterSec).toBeLessThanOrEqual(60)
    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1)
  })

  it('nach einer Minute wieder möglich', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    expect((await request()).status).toBe(200)
    vi.setSystemTime(Date.now() + 61 * 1000)
    expect((await request()).status).toBe(200)
    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(2)
  })

  it('gilt auch für unbekannte Adressen – verrät nicht, wer registriert ist', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)
    expect((await request()).status).toBe(200)
    expect((await request()).status).toBe(429)
  })

  it('andere Adresse ist nicht gesperrt', async () => {
    expect((await request()).status).toBe(200)
    expect((await request(`andere-${counter}@example.com`)).status).toBe(200)
  })
})

describe('POST /api/auth/resend-verification – Mindestabstand', () => {
  const resend = () =>
    resendVerificationRoute.POST(jsonRequest('POST', { email }, 'http://localhost/api/auth/resend-verification'))

  beforeEach(() => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', emailVerified: null })
  })

  it('zweite Anfrage innerhalb einer Minute: 429, keine zweite Mail', async () => {
    expect((await resend()).status).toBe(200)
    const second = await resend()
    expect(second.status).toBe(429)
    expect((await second.json()).retryAfterSec).toBeGreaterThan(0)
    expect(sendSignupVerificationEmail).toHaveBeenCalledTimes(1)
  })

  it('die Registrierung startet die Wartezeit bereits', async () => {
    // wie `POST /api/auth/register` nach dem Versand der ersten Mail
    checkMailCooldown(`signup:${email}`)
    expect((await resend()).status).toBe(429)
    expect(sendSignupVerificationEmail).not.toHaveBeenCalled()
  })
})

describe('POST /api/users/email/resend – Mindestabstand', () => {
  const resend = () =>
    emailResendRoute.POST(new NextRequest(jsonRequest('POST', {}, 'http://localhost/api/users/email/resend')))

  it('zweite Anfrage innerhalb einer Minute: 429 mit Restzeit', async () => {
    loginAs({ user: { id: `user-mail-${counter}`, pendingEmail: 'neu@example.com' } })
    expect((await resend()).status).toBe(200)
    const second = await resend()
    expect(second.status).toBe(429)
    const body = await second.json()
    expect(body.error).toBeTruthy()
    expect(body.retryAfterSec).toBeGreaterThan(0)
    expect(sendEmailChangeVerificationEmail).toHaveBeenCalledTimes(1)
  })

  it('ohne ausstehende Änderung: 400, Sperre wird nicht verbraucht', async () => {
    loginAs({ user: { id: `user-mail-${counter}`, pendingEmail: null } })
    expect((await resend()).status).toBe(400)
    loginAs({ user: { id: `user-mail-${counter}`, pendingEmail: 'neu@example.com' } })
    expect((await resend()).status).toBe(200)
  })
})
