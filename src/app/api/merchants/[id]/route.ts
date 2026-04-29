'use server'

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 })
    }

    const merchant = await prisma.merchant.findFirst({
      where: {
        id,
        userId: user.id
      }
    })

    if (!merchant) {
      return NextResponse.json({ error: 'Händler nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json(merchant)
  } catch (error) {
    console.error('Error fetching merchant:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden des Händlers' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

  const { name, categoryId } = await request.json()

  if (!name) {
    return new Response(
      JSON.stringify({ error: 'Name ist ein Pflichtfeld' }),
      {
        status: 400,
      }
    )
  }

  const existingMerchant = await prisma.merchant.findFirst({
    where: {
      userId: user.id,
      name: name,
      NOT: {
        id
      }
    }
  })

  if (existingMerchant) {
    return NextResponse.json(
      { error: 'Ein Händler mit diesem Namen existiert bereits' },
      { status: 400 }
    )
  }

  const merchant = await prisma.merchant.update({
    where: {
      id,
      userId: user.id,
    },
    data: {
      name,
      categoryId,
    },
    include: {
      category: true,
    },
  })

  return NextResponse.json(merchant)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

  await prisma.merchant.delete({
    where: {
      id,
      userId: user.id,
    },
  })

  return new Response(null, { status: 204 })
} 