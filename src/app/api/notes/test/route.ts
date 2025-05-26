import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { Prisma } from '@prisma/client'

export async function GET() {
  try {
    console.log('Test-Endpunkt aufgerufen')
    
    // Prüfe Datenbankverbindung
    try {
      await prisma.$connect()
      console.log('Datenbankverbindung OK')
    } catch (error) {
      console.error('Datenbankverbindungsfehler:', error)
      return NextResponse.json(
        { 
          error: 'Datenbankverbindungsfehler',
          details: error instanceof Error ? error.message : 'Unbekannter Fehler'
        },
        { status: 500 }
      )
    }
    
    const session = await getServerSession(authOptions)
    console.log('Session:', session?.user?.email)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })
    console.log('User gefunden:', user?.id)

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 })
    }

    // Versuche eine einfache Notizen-Abfrage
    const notes = await prisma.note.findMany({
      where: {
        userId: user.id,
      },
      take: 1,
    })
    console.log('Test-Notiz gefunden:', notes.length > 0)

    return NextResponse.json({
      status: 'OK',
      database: 'Connected',
      user: {
        id: user.id,
        email: user.email
      },
      notes: notes.length
    })
  } catch (error) {
    console.error('Test-Endpunkt Fehler:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { 
          error: 'Datenbankfehler',
          code: error.code,
          details: error.message
        },
        { status: 500 }
      )
    }
    return NextResponse.json(
      { 
        error: 'Test fehlgeschlagen',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
} 