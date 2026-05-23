import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'
import { validatePassword } from '@/lib/password-policy'
import {
  createDefaultAccountForUser,
  normalizeEmail,
} from '@/lib/accounts'

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

    const { email: rawEmail, password, salaryDay } = await request.json()

    if (!rawEmail || !password || !salaryDay) {
      return NextResponse.json(
        { message: 'Alle Felder müssen ausgefüllt werden' },
        { status: 400 }
      )
    }

    const email = normalizeEmail(rawEmail)

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Bitte geben Sie eine gültige E-Mail-Adresse ein' },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { message: 'Diese E-Mail-Adresse ist bereits registriert' },
        { status: 400 }
      )
    }

    const passwordError = validatePassword(password)
    if (passwordError) {
      return NextResponse.json({ message: passwordError }, { status: 400 })
    }

    if (salaryDay < 1 || salaryDay > 31) {
      return NextResponse.json(
        { message: 'Der Gehaltszahlungstag muss zwischen 1 und 31 liegen' },
        { status: 400 }
      )
    }

    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(password, salt)

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
        },
      })
      await createDefaultAccountForUser(user.id, salaryDay, 'Mein Konto', tx)
    })

    return NextResponse.json(
      { message: 'Benutzer erfolgreich erstellt' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registrierungsfehler:', error)

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          return NextResponse.json(
            { message: 'Diese E-Mail-Adresse ist bereits registriert' },
            { status: 400 }
          )
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
