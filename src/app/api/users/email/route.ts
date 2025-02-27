import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import bcrypt from 'bcryptjs'

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

    const { newEmail, password } = await request.json()

    // Validiere E-Mail-Format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json(
        { error: 'Ungültige E-Mail-Adresse' },
        { status: 400 }
      )
    }

    // Prüfe, ob die neue E-Mail bereits existiert
    const existingUser = await prisma.user.findUnique({
      where: { email: newEmail }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Diese E-Mail-Adresse wird bereits verwendet' },
        { status: 400 }
      )
    }

    // Hole aktuellen Benutzer
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Benutzer nicht gefunden' },
        { status: 404 }
      )
    }

    // Überprüfe das Passwort
    const isPasswordValid = await bcrypt.compare(password, currentUser.passwordHash)
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Falsches Passwort' },
        { status: 400 }
      )
    }

    // Aktualisiere die E-Mail-Adresse
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: { email: newEmail }
    })

    return NextResponse.json({ 
      message: 'E-Mail-Adresse wurde erfolgreich aktualisiert',
      email: newEmail
    })
  } catch (error) {
    console.error('Error updating email:', error)
    return NextResponse.json(
      { error: 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    )
  }
} 