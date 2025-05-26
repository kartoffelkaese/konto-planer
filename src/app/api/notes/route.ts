import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { Prisma } from '@prisma/client'

export async function GET() {
  console.log('GET /api/notes - Start')
  const session = await getServerSession(authOptions)
  if (!session) {
    console.log('GET /api/notes - Keine Session gefunden')
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    console.log('GET /api/notes - Suche User:', session.user?.email)
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email as string },
    })

    if (!user) {
      console.log('GET /api/notes - User nicht gefunden')
      return new NextResponse('User not found', { status: 404 })
    }

    console.log('GET /api/notes - Hole Notizen für User:', user.id)
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

    console.log('GET /api/notes - Erfolgreich, Anzahl Notizen:', notes.length)
    return NextResponse.json(notes)
  } catch (error) {
    console.error('GET /api/notes - Fehler:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma Fehler Code:', error.code)
      console.error('Prisma Fehler Nachricht:', error.message)
    }
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function POST(request: Request) {
  console.log('POST /api/notes - Start')
  const session = await getServerSession(authOptions)
  if (!session) {
    console.log('POST /api/notes - Keine Session gefunden')
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    console.log('POST /api/notes - Suche User:', session.user?.email)
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email as string },
    })

    if (!user) {
      console.log('POST /api/notes - User nicht gefunden')
      return new NextResponse('User not found', { status: 404 })
    }

    const body = await request.json()
    console.log('POST /api/notes - Request Body:', JSON.stringify(body))
    const { title, content, months } = body

    if (!title || !content || !months || !Array.isArray(months)) {
      console.log('POST /api/notes - Ungültige Anfragedaten:', { title, content, months })
      return new NextResponse('Invalid request data', { status: 400 })
    }

    const formattedMonths = months.map((m: any) => {
      if (typeof m === 'number') return { month: m }
      if (typeof m === 'object' && m !== null && 'month' in m) return { month: m.month }
      throw new Error('Invalid month format')
    })

    console.log('POST /api/notes - Erstelle Notiz für User:', user.id)
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

    console.log('POST /api/notes - Notiz erfolgreich erstellt:', note.id)
    return NextResponse.json(note)
  } catch (error) {
    console.error('POST /api/notes - Fehler:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma Fehler Code:', error.code)
      console.error('Prisma Fehler Nachricht:', error.message)
    }
    if (error instanceof Error) {
      return new NextResponse(error.message, { status: 400 })
    }
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 