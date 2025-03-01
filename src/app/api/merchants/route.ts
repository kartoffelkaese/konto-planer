'use server'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

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

    const merchants = await prisma.merchant.findMany({
      where: {
        userId: user.id,
      },
      include: {
        category: true,
      },
    })

    return NextResponse.json(merchants)
  } catch (error) {
    console.error('Detaillierter Fehler beim Laden der Händler:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Händler' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

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
        name: name
      }
    })

    if (existingMerchant) {
      return NextResponse.json(
        { error: 'Ein Händler mit diesem Namen existiert bereits' },
        { status: 400 }
      )
    }

    const merchant = await prisma.merchant.create({
      data: {
        name,
        categoryId,
        userId: user.id,
      },
      include: {
        category: true,
      }
    })

    return NextResponse.json(merchant)
  } catch (error) {
    console.error('Detaillierter Fehler beim Erstellen des Händlers:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fehler beim Erstellen des Händlers' },
      { status: 500 }
    )
  }
} 