import { createHash, randomBytes } from 'crypto'
import { EmailVerificationPurpose } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getAuthBaseUrl, sendEmail } from '@/lib/email'
import { normalizeEmail } from '@/lib/accounts'
import { trialEndsAt } from '@/lib/plans'

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

function verificationEmailContent(
  purpose: EmailVerificationPurpose,
  verifyUrl: string
): { subject: string; html: string; text: string } {
  const expiresHint = 'Der Link ist 24 Stunden gültig.'

  if (purpose === EmailVerificationPurpose.EMAIL_CHANGE) {
    return {
      subject: 'Neue E-Mail-Adresse bestätigen – KontoPlaner',
      html: `
        <p>Hallo,</p>
        <p>bitte bestätige deine neue E-Mail-Adresse für KontoPlaner:</p>
        <p><a href="${verifyUrl}">E-Mail-Adresse bestätigen</a></p>
        <p>${expiresHint}</p>
        <p>Falls du diese Änderung nicht angefordert hast, ignoriere diese E-Mail.</p>
      `,
      text: `Bitte bestätige deine neue E-Mail-Adresse für KontoPlaner:\n${verifyUrl}\n\n${expiresHint}`,
    }
  }

  return {
    subject: 'Bitte bestätige deine E-Mail-Adresse – KontoPlaner',
    html: `
      <p>Hallo,</p>
      <p>vielen Dank für deine Registrierung bei KontoPlaner.</p>
      <p>Bitte bestätige deine E-Mail-Adresse:</p>
      <p><a href="${verifyUrl}">E-Mail-Adresse bestätigen</a></p>
      <p>${expiresHint}</p>
    `,
    text: `Vielen Dank für deine Registrierung bei KontoPlaner.\n\nBitte bestätige deine E-Mail-Adresse:\n${verifyUrl}\n\n${expiresHint}`,
  }
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
  const verifyUrl = buildVerificationUrl(rawToken)
  const content = verificationEmailContent(
    EmailVerificationPurpose.SIGNUP,
    verifyUrl
  )
  await sendEmail({
    to: email,
    subject: content.subject,
    html: content.html,
    text: content.text,
  })
}

export async function sendEmailChangeVerificationEmail(
  newEmail: string,
  rawToken: string
): Promise<void> {
  const verifyUrl = buildVerificationUrl(rawToken)
  const content = verificationEmailContent(
    EmailVerificationPurpose.EMAIL_CHANGE,
    verifyUrl
  )
  await sendEmail({
    to: newEmail,
    subject: content.subject,
    html: content.html,
    text: content.text,
  })
}

export async function sendPasswordResetEmail(email: string, rawToken: string): Promise<void> {
  const resetUrl = buildPasswordResetUrl(rawToken)
  await sendEmail({
    to: email,
    subject: 'Passwort zurücksetzen – KontoPlaner',
    html: `
      <p>Hallo,</p>
      <p>für dein KontoPlaner-Konto wurde ein neues Passwort angefordert:</p>
      <p><a href="${resetUrl}">Neues Passwort festlegen</a></p>
      <p>Der Link ist 1 Stunde gültig. Danach werden alle anderen Anmeldungen beendet.</p>
      <p>Falls du das nicht angefordert hast, ignoriere diese E-Mail – dein Passwort bleibt unverändert.</p>
    `,
    text: `Für dein KontoPlaner-Konto wurde ein neues Passwort angefordert:\n${resetUrl}\n\nDer Link ist 1 Stunde gültig. Falls du das nicht angefordert hast, ignoriere diese E-Mail.`,
  })
}

/** Registrierung mit einer bereits verwendeten Adresse: Hinweis an diese Adresse statt Meldung im Formular */
export async function sendAlreadyRegisteredEmail(email: string): Promise<void> {
  const baseUrl = getAuthBaseUrl()
  await sendEmail({
    to: email,
    subject: 'Du hast bereits ein Konto – KontoPlaner',
    html: `
      <p>Hallo,</p>
      <p>mit dieser E-Mail-Adresse wurde gerade versucht, ein KontoPlaner-Konto zu erstellen. Du hast bereits eines.</p>
      <p><a href="${baseUrl}/auth/login">Zur Anmeldung</a> · <a href="${baseUrl}/auth/forgot-password">Passwort vergessen?</a></p>
      <p>Falls du das nicht warst, kannst du diese E-Mail ignorieren.</p>
    `,
    text: `Mit dieser E-Mail-Adresse wurde gerade versucht, ein KontoPlaner-Konto zu erstellen. Du hast bereits eines.\n\nAnmelden: ${baseUrl}/auth/login\nPasswort vergessen: ${baseUrl}/auth/forgot-password`,
  })
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

  // Reset-Links dürfen nie als E-Mail-Bestätigung gelten
  if (!record || record.purpose === EmailVerificationPurpose.PASSWORD_RESET) {
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

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: record.userId },
      data: {
        email: newEmail,
        pendingEmail: null,
        emailVerified: now,
      },
    })
    await tx.emailVerificationToken.deleteMany({
      where: { userId: record.userId },
    })
  })

  return { ok: true, purpose: EmailVerificationPurpose.EMAIL_CHANGE }
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
