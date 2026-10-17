import { createHash, randomBytes } from 'crypto'
import { EmailVerificationPurpose } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getAuthBaseUrl, sendEmail } from '@/lib/email'
import {
  alreadyRegisteredEmail,
  emailChangeVerificationEmail,
  passwordResetEmail,
  signupVerificationEmail,
} from '@/lib/emailTemplates'
import { normalizeEmail } from '@/lib/accounts'
import { trialEndsAt } from '@/lib/plans'
import { updateStripeCustomerEmail } from '@/lib/billing'
import { logger } from '@/lib/logger'

export const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000
/** Links zum Zurücksetzen des Passworts gelten kürzer */
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000

/**
 * Fehlercodes statt Texten: Die Login-Seite zeigt zu jedem Code einen festen Text.
 * So lässt sich über die URL kein beliebiger Text in die Seite einschleusen.
 */
export const VERIFY_ERROR_CODES = ['missing', 'invalid', 'expired', 'taken'] as const
export type VerifyErrorCode = (typeof VERIFY_ERROR_CODES)[number]

export type VerifyEmailResult =
  | { ok: true; purpose: EmailVerificationPurpose }
  | { ok: false; error: VerifyErrorCode }

export type ResetPasswordResult = { ok: true } | { ok: false; error: 'invalid' | 'expired' }

function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex')
}

function buildVerificationUrl(rawToken: string): string {
  return `${getAuthBaseUrl()}/auth/verify-email?token=${encodeURIComponent(rawToken)}`
}

function buildPasswordResetUrl(rawToken: string): string {
  return `${getAuthBaseUrl()}/auth/reset-password?token=${encodeURIComponent(rawToken)}`
}

export async function createVerificationToken(
  userId: string,
  purpose: EmailVerificationPurpose,
  newEmail?: string
): Promise<string> {
  const rawToken = randomBytes(32).toString('hex')
  const tokenHash = hashToken(rawToken)
  const ttl =
    purpose === EmailVerificationPurpose.PASSWORD_RESET
      ? PASSWORD_RESET_TTL_MS
      : EMAIL_VERIFICATION_TTL_MS
  const expiresAt = new Date(Date.now() + ttl)

  await prisma.$transaction(async (tx) => {
    await tx.emailVerificationToken.deleteMany({
      where: { userId, purpose },
    })
    await tx.emailVerificationToken.create({
      data: {
        userId,
        purpose,
        tokenHash,
        newEmail: newEmail ? normalizeEmail(newEmail) : null,
        expiresAt,
      },
    })
  })

  return rawToken
}

export async function sendSignupVerificationEmail(
  email: string,
  rawToken: string
): Promise<void> {
  await sendEmail({ to: email, ...signupVerificationEmail(buildVerificationUrl(rawToken)) })
}

export async function sendEmailChangeVerificationEmail(
  newEmail: string,
  rawToken: string
): Promise<void> {
  await sendEmail({ to: newEmail, ...emailChangeVerificationEmail(buildVerificationUrl(rawToken)) })
}

export async function sendPasswordResetEmail(email: string, rawToken: string): Promise<void> {
  await sendEmail({ to: email, ...passwordResetEmail(buildPasswordResetUrl(rawToken)) })
}

/** Registrierung mit einer bereits verwendeten Adresse: Hinweis an diese Adresse statt Meldung im Formular */
export async function sendAlreadyRegisteredEmail(email: string): Promise<void> {
  await sendEmail({ to: email, ...alreadyRegisteredEmail(getAuthBaseUrl()) })
}

/** Setzt ein neues Passwort über einen Reset-Link; beendet alle bestehenden Sitzungen */
export async function resetPasswordWithToken(
  rawToken: string,
  passwordHash: string
): Promise<ResetPasswordResult> {
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
  })

  if (!record || record.purpose !== EmailVerificationPurpose.PASSWORD_RESET) {
    return { ok: false, error: 'invalid' }
  }

  const now = new Date()
  if (record.expiresAt <= now) {
    await prisma.emailVerificationToken.delete({ where: { id: record.id } })
    return { ok: false, error: 'expired' }
  }

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({
      where: { id: record.userId },
      select: { emailVerified: true },
    })
    await tx.user.update({
      where: { id: record.userId },
      data: {
        passwordHash,
        sessionVersion: { increment: 1 },
        // Der Link ging an diese Adresse – damit ist sie auch bestätigt
        emailVerified: user.emailVerified ?? now,
      },
    })
    await tx.emailVerificationToken.deleteMany({
      where: { userId: record.userId, purpose: EmailVerificationPurpose.PASSWORD_RESET },
    })
  })

  return { ok: true }
}

export async function hasValidVerificationToken(userId: string): Promise<boolean> {
  const now = new Date()
  const token = await prisma.emailVerificationToken.findFirst({
    where: {
      userId,
      expiresAt: { gt: now },
    },
    select: { id: true },
  })
  return token !== null
}

export async function verifyEmailToken(rawToken: string): Promise<VerifyEmailResult> {
  const tokenHash = hashToken(rawToken)
  const now = new Date()

  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  })

  // Reset- und Kündigungslinks dürfen nie als E-Mail-Bestätigung gelten
  if (
    !record ||
    record.purpose === EmailVerificationPurpose.PASSWORD_RESET ||
    record.purpose === EmailVerificationPurpose.CANCEL_SUBSCRIPTION
  ) {
    return { ok: false, error: 'invalid' }
  }

  if (record.expiresAt <= now) {
    await prisma.emailVerificationToken.delete({ where: { id: record.id } })
    return { ok: false, error: 'expired' }
  }

  if (record.purpose === EmailVerificationPurpose.SIGNUP) {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: record.userId },
        select: { plan: true, planSource: true },
      })
      // Testphase: neue Nutzer bekommen ab der bestätigten Adresse befristet „Komplett“.
      // Wer schon ein zugewiesenes Level hat (Bestand, Verwaltung), behält es.
      const startTrial = user != null && user.planSource === null
      const trialEnd = trialEndsAt(now)
      await tx.user.update({
        where: { id: record.userId },
        data: {
          emailVerified: now,
          ...(startTrial
            ? { plan: 'FULL', planSource: 'TRIAL', planExpiresAt: trialEnd }
            : {}),
        },
      })
      if (startTrial) {
        await tx.planChange.create({
          data: {
            userId: record.userId,
            fromPlan: user.plan,
            toPlan: 'FULL',
            source: 'TRIAL',
            expiresAt: trialEnd,
          },
        })
      }
      await tx.emailVerificationToken.deleteMany({
        where: { userId: record.userId },
      })
    })
    return { ok: true, purpose: EmailVerificationPurpose.SIGNUP }
  }

  const newEmail = record.newEmail
  if (!newEmail) {
    return { ok: false, error: 'invalid' }
  }

  const taken = await prisma.user.findFirst({
    where: {
      OR: [{ email: newEmail }, { pendingEmail: newEmail }],
      NOT: { id: record.userId },
    },
    select: { id: true },
  })

  if (taken) {
    return { ok: false, error: 'taken' }
  }

  const customer = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: record.userId },
      data: {
        email: newEmail,
        pendingEmail: null,
        emailVerified: now,
      },
      select: { stripeCustomerId: true },
    })
    await tx.emailVerificationToken.deleteMany({
      where: { userId: record.userId },
    })
    return updated?.stripeCustomerId ?? null
  })

  // Rechnungen und Belege sollen an die neue Adresse gehen; ein Fehler hier ändert nichts
  // daran, dass die Adresse in der App gewechselt ist
  if (customer && process.env.STRIPE_SECRET_KEY) {
    try {
      await updateStripeCustomerEmail(customer, newEmail)
    } catch (error) {
      logger.error('E-Mail-Adresse konnte nicht an Stripe übergeben werden', error, {
        endpoint: 'verifyEmailToken',
      })
    }
  }

  return { ok: true, purpose: EmailVerificationPurpose.EMAIL_CHANGE }
}

export type CancellationTokenResult =
  | { ok: true; userId: string }
  | { ok: false; error: 'invalid' | 'expired' }

/**
 * Löst einen Link zur Bestätigung einer Kündigung ein. Der Link gilt nur einmal: Er wird
 * hier gelöscht, auch wenn die Kündigung danach (z. B. weil kein Abo mehr läuft) nichts tut.
 */
export async function consumeCancellationToken(rawToken: string): Promise<CancellationTokenResult> {
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
  })

  if (!record || record.purpose !== EmailVerificationPurpose.CANCEL_SUBSCRIPTION) {
    return { ok: false, error: 'invalid' }
  }

  await prisma.emailVerificationToken.delete({ where: { id: record.id } })
  if (record.expiresAt <= new Date()) {
    return { ok: false, error: 'expired' }
  }

  return { ok: true, userId: record.userId }
}

export async function cancelPendingEmailChange(userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.emailVerificationToken.deleteMany({
      where: { userId, purpose: EmailVerificationPurpose.EMAIL_CHANGE },
    })
    await tx.user.update({
      where: { id: userId },
      data: { pendingEmail: null },
    })
  })
}

export async function isEmailTaken(
  email: string,
  excludeUserId?: string
): Promise<boolean> {
  const normalized = normalizeEmail(email)
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: normalized }, { pendingEmail: normalized }],
      ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
    },
    select: { id: true },
  })
  return existing !== null
}
