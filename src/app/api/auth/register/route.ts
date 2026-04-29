import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'

export async function POST(request: Request) {
  try {
    const { email, password, salaryDay } = await request.json()

    // Validierung
    if (!email || !password || !salaryDay) {
      return NextResponse.json(
        { message: 'Alle Felder müssen ausgefüllt werden' },
        { status: 400 }
      )
    }

    // E-Mail-Format validieren
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Bitte geben Sie eine gültige E-Mail-Adresse ein' },
        { status: 400 }
      )
    }

    // Prüfe, ob die E-Mail bereits existiert
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { message: 'Diese E-Mail-Adresse ist bereits registriert' },
        { status: 400 }
      )
    }

    // Validiere Passwortlänge
    if (password.length < 8) {
      return NextResponse.json(
        { message: 'Das Passwort muss mindestens 8 Zeichen lang sein' },
        { status: 400 }
      )
    }

    // Validiere salaryDay
    if (salaryDay < 1 || salaryDay > 31) {
      return NextResponse.json(
        { message: 'Der Gehaltszahlungstag muss zwischen 1 und 31 liegen' },
        { status: 400 }
      )
    }

    // Hash das Passwort
    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(password, salt)

    // Erstelle den Benutzer
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        salaryDay,
        accountName: 'Mein Konto' // Standardwert
      }
    })

    return NextResponse.json(
      { message: 'Benutzer erfolgreich erstellt' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registrierungsfehler:', error)

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Prisma-spezifische Fehler
      switch (error.code) {
        case 'P2002':
          return NextResponse.json(
            { message: 'Diese E-Mail-Adresse ist bereits registriert' },
            { status: 400 }
          )
        default:
          return NextResponse.json(
            { message: 'Datenbankfehler: ' + error.message },
            { status: 500 }
          )
      }
    }

    return NextResponse.json(
      { message: 'Ein unerwarteter Fehler ist aufgetreten: ' + (error instanceof Error ? error.message : 'Unbekannter Fehler') },
      { status: 500 }
    )
  }
} 