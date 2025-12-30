'use server'

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()

  if (!session) {
    return new Response(JSON.stringify({ error: 'Nicht authentifiziert' }), {
      status: 401,
    })
  }

  const user = await prisma.user.findUnique({
    where: {
      email: session.user?.email!,
    },
  })

  if (!user) {
    return new Response(JSON.stringify({ error: 'Benutzer nicht gefunden' }), {
      status: 404,
    })
  }

  const categories = await prisma.category.findMany({
    where: {
      userId: user.id,
    },
    include: {
      _count: {
        select: { merchants: true }
      }
    }
  })

  return NextResponse.json(categories)
}

export async function POST(request: Request) {
  const session = await auth()

  if (!session) {
    return new Response(JSON.stringify({ error: 'Nicht authentifiziert' }), {
      status: 401,
    })
  }

  const user = await prisma.user.findUnique({
    where: {
      email: session.user?.email!,
    },
  })

  if (!user) {
    return new Response(JSON.stringify({ error: 'Benutzer nicht gefunden' }), {
      status: 404,
    })
  }

  const { name, color } = await request.json()

  if (!name || !color) {
    return new Response(
      JSON.stringify({ error: 'Name und Farbe sind Pflichtfelder' }),
      {
        status: 400,
      }
    )
  }

  const existingCategory = await prisma.category.findFirst({
    where: {
      userId: user.id,
      name: name,
    },
  })

  if (existingCategory) {
    return new Response(
      JSON.stringify({ error: 'Eine Kategorie mit diesem Namen existiert bereits' }),
      { status: 400 }
    )
  }

  const category = await prisma.category.create({
    data: {
      name,
      color,
      userId: user.id,
    },
  })

  return NextResponse.json(category)
} 