import { createHash, randomBytes } from 'crypto'
import { EmailVerificationPurpose } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getAuthBaseUrl, sendEmail } from '@/lib/email'
import { normalizeEmail } from '@/lib/accounts'

export const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000

export type VerifyEmailResult =
  | { ok: true; purpose: EmailVerificationPurpose }
  | { ok: false; error: string }

function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex')
}

function buildVerificationUrl(rawToken: string): string {
  return `${getAuthBaseUrl()}/auth/verify-email?token=${encodeURIComponent(rawToken)}`
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
        <p>bitte bestätigen Sie Ihre neue E-Mail-Adresse für KontoPlaner:</p>
        <p><a href="${verifyUrl}">E-Mail-Adresse bestätigen</a></p>
        <p>${expiresHint}</p>
        <p>Falls Sie diese Änderung nicht angefordert haben, ignorieren Sie diese E-Mail.</p>
      `,
      text: `Bitte bestätigen Sie Ihre neue E-Mail-Adresse für KontoPlaner:\n${verifyUrl}\n\n${expiresHint}`,
    }
  }

  return {
    subject: 'Bitte bestätigen Sie Ihre E-Mail-Adresse – KontoPlaner',
    html: `
      <p>Hallo,</p>
      <p>vielen Dank für Ihre Registrierung bei KontoPlaner.</p>
      <p>Bitte bestätigen Sie Ihre E-Mail-Adresse:</p>
      <p><a href="${verifyUrl}">E-Mail-Adresse bestätigen</a></p>
      <p>${expiresHint}</p>
    `,
    text: `Vielen Dank für Ihre Registrierung bei KontoPlaner.\n\nBitte bestätigen Sie Ihre E-Mail-Adresse:\n${verifyUrl}\n\n${expiresHint}`,
  }
}

export async function createVerificationToken(
  userId: string,
  purpose: EmailVerificationPurpose,
  newEmail?: string
): Promise<string> {
  const rawToken = randomBytes(32).toString('hex')
  const tokenHash = hashToken(rawToken)
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS)

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

  if (!record) {
    return { ok: false, error: 'Ungültiger oder abgelaufener Link.' }
  }

  if (record.expiresAt <= now) {
    await prisma.emailVerificationToken.delete({ where: { id: record.id } })
    return { ok: false, error: 'Der Bestätigungslink ist abgelaufen.' }
  }

  if (record.purpose === EmailVerificationPurpose.SIGNUP) {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: record.userId },
        data: { emailVerified: now },
      })
      await tx.emailVerificationToken.deleteMany({
        where: { userId: record.userId },
      })
    })
    return { ok: true, purpose: EmailVerificationPurpose.SIGNUP }
  }

  const newEmail = record.newEmail
  if (!newEmail) {
    return { ok: false, error: 'Ungültiger Bestätigungslink.' }
  }

  const taken = await prisma.user.findFirst({
    where: {
      OR: [{ email: newEmail }, { pendingEmail: newEmail }],
      NOT: { id: record.userId },
    },
    select: { id: true },
  })

  if (taken) {
    return {
      ok: false,
      error: 'Diese E-Mail-Adresse wird bereits verwendet.',
    }
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
