import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const noteId = searchParams.get('noteId')
    const year = searchParams.get('year')
    const month = searchParams.get('month')

    if (!noteId || !year || !month) {
      return new NextResponse('Missing required parameters', { status: 400 })
    }

    // Prüfe, ob die Notiz existiert und dem User gehört
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email as string },
    })

    if (!user) {
      return new NextResponse('User not found', { status: 404 })
    }

    const note = await prisma.note.findFirst({
      where: {
        id: parseInt(noteId),
        userId: user.id,
      },
    })

    if (!note) {
      return new NextResponse('Note not found', { status: 404 })
    }

    const readStatus = await prisma.noteReadStatus.findFirst({
      where: {
        noteId: parseInt(noteId),
        year: parseInt(year),
        month: parseInt(month),
      },
    })

    return NextResponse.json(readStatus || { isRead: false })
  } catch (error) {
    console.error('Error fetching read status:', error)
    if (error instanceof Error) {
      return new NextResponse(error.message, { status: 400 })
    }
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const body = await request.json()
    const { noteId, year, month } = body

    if (!noteId || !year || !month) {
      return new NextResponse('Invalid request data', { status: 400 })
    }

    // Prüfe, ob die Notiz existiert und dem User gehört
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email as string },
    })

    if (!user) {
      return new NextResponse('User not found', { status: 404 })
    }

    const note = await prisma.note.findFirst({
      where: {
        id: parseInt(noteId),
        userId: user.id,
      },
    })

    if (!note) {
      return new NextResponse('Note not found', { status: 404 })
    }

    // Prüfe, ob bereits ein Lesestatus existiert
    const existingStatus = await prisma.noteReadStatus.findFirst({
      where: {
        noteId: parseInt(noteId),
        year: parseInt(year),
        month: parseInt(month),
      },
    })

    let readStatus
    if (existingStatus) {
      // Update existing status
      readStatus = await prisma.noteReadStatus.update({
        where: {
          id: existingStatus.id,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      })
    } else {
      // Create new status
      readStatus = await prisma.noteReadStatus.create({
        data: {
          noteId: parseInt(noteId),
          year: parseInt(year),
          month: parseInt(month),
          isRead: true,
          readAt: new Date(),
        },
      })
    }

    return NextResponse.json(readStatus)
  } catch (error) {
    console.error('Error marking note as read:', error)
    if (error instanceof Error) {
      return new NextResponse(error.message, { status: 400 })
    }
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 