import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { Prisma } from '@prisma/client'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 })
    }

    const notes = await prisma.note.findMany({
      where: {
        userId: user.id,
      },
      include: {
        months: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(notes)
  } catch (error) {
    console.error('Error fetching notes:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Notizen' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 })
    }

    const body = await request.json()
    const { title, content, months } = body

    if (!title || !content || !months || !Array.isArray(months)) {
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

    return NextResponse.json(note)
  } catch (error) {
    console.error('Error creating note:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
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