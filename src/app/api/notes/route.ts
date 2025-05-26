import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { Prisma } from '@prisma/client'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email as string },
    })

    if (!user) {
      return new NextResponse('User not found', { status: 404 })
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
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email as string },
    })

    if (!user) {
      return new NextResponse('User not found', { status: 404 })
    }

    const body = await request.json()
    const { title, content, months } = body

    if (!title || !content || !months || !Array.isArray(months)) {
      return new NextResponse('Invalid request data', { status: 400 })
    }

    const formattedMonths = months.map((m: any) => {
      if (typeof m === 'number') return { month: m }
      if (typeof m === 'object' && m !== null && 'month' in m) return { month: m.month }
      throw new Error('Invalid month format')
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
    if (error instanceof Error) {
      return new NextResponse(error.message, { status: 400 })
    }
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 