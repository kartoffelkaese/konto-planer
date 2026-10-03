import { NextResponse } from 'next/server'
import { EmailVerificationPurpose } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'
import { hashPassword } from '@/lib/password-hash'
import { validatePassword } from '@/lib/password-policy'
import {
  createDefaultAccountForUser,
  isValidEmail,
  normalizeEmail,
} from '@/lib/accounts'
import { isErrorResponse, validateSalaryDay } from '@/lib/api-auth'
import { cleanupUnverifiedUsers } from '@/lib/cleanupUnverifiedUsers'
import {
  createVerificationToken,
  sendAlreadyRegisteredEmail,
  sendSignupVerificationEmail,
} from '@/lib/emailVerification'
import { logger } from '@/lib/logger'

function signupResponse() {
  return NextResponse.json(
    {
      message:
        'Konto erstellt. Bitte bestätige deine E-Mail-Adresse über den Link in der E-Mail.',
    },
    { status: 201 }
  )
}

/** Registrierung mit vergebener Adresse: unbestätigt → neuer Bestätigungslink, sonst Hinweis-Mail */
async function notifyExistingRegistration(
  existingUser: { id: string; email: string; emailVerified: Date | null },
  email: string
) {
  // Adresse ist nur als ausstehende Änderung eines anderen Kontos vorgemerkt: nichts senden
  if (existingUser.email !== email) return

  try {
    if (existingUser.emailVerified) {
      await sendAlreadyRegisteredEmail(email)
    } else {
      const rawToken = await createVerificationToken(
        existingUser.id,
        EmailVerificationPurpose.SIGNUP
      )
      await sendSignupVerificationEmail(email, rawToken)
    }
  } catch (error) {
    logger.error('Hinweis-Mail bei Registrierung fehlgeschlagen', error, { endpoint: '/api/auth/register' })
  }
}

async function rollbackUnverifiedUser(userId: string) {
  const memberships = await prisma.accountMember.findMany({
    where: { userId },
    select: { accountId: true },
  })

  await prisma.$transaction(async (tx) => {
    for (const { accountId } of memberships) {
      const memberCount = await tx.accountMember.count({
        where: { accountId },
      })
      if (memberCount === 1) {
        await tx.account.delete({ where: { id: accountId } })
      }
    }
    await tx.user.delete({ where: { id: userId } })
  })
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers)
    const { allowed } = checkRateLimit(`register:${ip}`, RATE_LIMITS.register)
    if (!allowed) {
      return NextResponse.json(
        { message: 'Zu viele Registrierungsversuche. Bitte später erneut versuchen.' },
        { status: 429 }
      )
    }

    await cleanupUnverifiedUsers()

    const { email: rawEmail, password, salaryDay: rawSalaryDay } = await request.json()

    if (!rawEmail || !password || !rawSalaryDay) {
      return NextResponse.json(
        { message: 'Alle Felder müssen ausgefüllt werden' },
        { status: 400 }
      )
    }

    if (typeof rawEmail !== 'string' || typeof password !== 'string') {
      return NextResponse.json(
        { message: 'Alle Felder müssen ausgefüllt werden' },
        { status: 400 }
      )
    }

    const email = normalizeEmail(rawEmail)

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { message: 'Bitte gib eine gültige E-Mail-Adresse ein' },
        { status: 400 }
      )
    }

    const passwordError = validatePassword(password)
    if (passwordError) {
      return NextResponse.json({ message: passwordError }, { status: 400 })
    }

    const salaryDay = validateSalaryDay(rawSalaryDay)
    if (isErrorResponse(salaryDay)) {
      return NextResponse.json(
        { message: 'Der Gehaltszahlungstag muss zwischen 1 und 31 liegen' },
        { status: 400 }
      )
    }

    // Hash immer berechnen, damit die Antwortzeit nicht verrät, ob die Adresse schon existiert
    const passwordHash = await hashPassword(password)

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { pendingEmail: email }],
      },
    })

    // Vergebene Adresse: dieselbe Antwort wie bei Erfolg, Hinweis geht per E-Mail an die Adresse
    if (existingUser) {
      await notifyExistingRegistration(existingUser, email)
      return signupResponse()
    }

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          passwordHash,
          emailVerified: null,
        },
      })
      await createDefaultAccountForUser(created.id, salaryDay, 'Mein Konto', tx)
      return created
    })

    try {
      const rawToken = await createVerificationToken(
        user.id,
        EmailVerificationPurpose.SIGNUP
      )
      await sendSignupVerificationEmail(email, rawToken)
    } catch (mailError) {
      logger.error('Registrierungs-Mail fehlgeschlagen', mailError, { endpoint: '/api/auth/register' })
      await rollbackUnverifiedUser(user.id)
      return NextResponse.json(
        {
          message:
            'Konto konnte nicht erstellt werden. E-Mail-Versand fehlgeschlagen. Bitte später erneut versuchen.',
        },
        { status: 500 }
      )
    }

    return signupResponse()
  } catch (error) {
    logger.error('Registrierungsfehler', error, { endpoint: '/api/auth/register' })

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          // Gleichzeitige Registrierung derselben Adresse – nach außen wie Erfolg
          return signupResponse()
        default:
          break
      }
    }

    return NextResponse.json(
      { message: 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    )
  }
}
