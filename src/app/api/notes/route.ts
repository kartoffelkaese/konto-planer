import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { Prisma } from '@prisma/client'

export async function GET() {
  try {
    console.log('GET /api/notes - Start')
    const session = await getServerSession(authOptions)
    console.log('Session:', session?.user?.email)
    
    if (!session?.user?.email) {
      console.log('Keine Session gefunden')
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })
    console.log('User gefunden:', user?.id)

    if (!user) {
      console.log('Benutzer nicht gefunden')
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 })
    }

    console.log('Suche Notizen für User:', user.id)
    const notes = await prisma.note.findMany({
      where: {
        userId: user.id,
      },
      include: {
        months: true,
        readStatus: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
    console.log('Gefundene Notizen:', notes.length)

    return NextResponse.json(notes)
  } catch (error) {
    console.error('Error fetching notes:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma Fehler:', error.code, error.message)
      return NextResponse.json(
        { error: 'Datenbankfehler beim Laden der Notizen' },
        { status: 500 }
      )
    }
    return NextResponse.json(
      { error: 'Fehler beim Laden der Notizen' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    console.log('POST /api/notes - Start')
    const session = await getServerSession(authOptions)
    console.log('Session:', session?.user?.email)
    
    if (!session?.user?.email) {
      console.log('Keine Session gefunden')
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })
    console.log('User gefunden:', user?.id)

    if (!user) {
      console.log('Benutzer nicht gefunden')
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 })
    }

    const body = await request.json()
    console.log('Request Body:', body)
    const { title, content, months } = body

    if (!title || !content || !months || !Array.isArray(months)) {
      console.log('Ungültige Anfragedaten:', { title, content, months })
      return NextResponse.json(
        { error: 'Ungültige Anfragedaten' },
        { status: 400 }
      )
    }

    const formattedMonths = months.map((m: any) => {
      if (typeof m === 'number') return { month: m }
      if (typeof m === 'object' && m !== null && 'month' in m) return { month: m.month }
      throw new Error('Ungültiges Monatsformat')
    })
    console.log('Formatierte Monate:', formattedMonths)

    const note = await prisma.note.create({
      data: {
        title,
        content,
        userId: user.id,
        months: {
          create: formattedMonths,
        },
      },
      include: {
        months: true,
      },
    })
    console.log('Notiz erstellt:', note.id)

    return NextResponse.json(note)
  } catch (error) {
    console.error('Error creating note:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma Fehler:', error.code, error.message)
      return NextResponse.json(
        { error: 'Datenbankfehler bei der Erstellung der Notiz' },
        { status: 400 }
      )
    }
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
} 