'use server'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserBySession, isErrorResponse } from '@/lib/api-auth'

export async function GET() {
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult

  const categories = await prisma.category.findMany({
    where: {
      userId: user.id,
    },
    include: {
      _count: {
        select: { merchants: true },
      },
    },
  })

  return NextResponse.json(categories)
}

export async function POST(request: Request) {
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult

  const { name, color } = await request.json()

  if (!name || !color) {
    return NextResponse.json(
      { error: 'Name und Farbe sind Pflichtfelder' },
      { status: 400 }
    )
  }

  const existingCategory = await prisma.category.findFirst({
    where: {
      userId: user.id,
      name: name,
    },
  })

  if (existingCategory) {
    return NextResponse.json(
      { error: 'Eine Kategorie mit diesem Namen existiert bereits' },
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
