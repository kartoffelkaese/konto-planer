'use server'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    console.log('Session:', session)

    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    if (!session.user?.email) {
      return NextResponse.json({ error: 'Keine E-Mail-Adresse gefunden' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    console.log('User:', user)

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 })
    }

    const merchants = await prisma.merchant.findMany({
      where: { userId: user.id },
      orderBy: { name: 'asc' }
    })
    console.log('Merchants:', merchants)

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
    console.log('Session bei POST:', session)

    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    if (!session.user?.email) {
      return NextResponse.json({ error: 'Keine E-Mail-Adresse gefunden' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    console.log('User bei POST:', user)

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 })
    }

    const { name, category } = await request.json()
    console.log('Empfangene Daten:', { name, category })

    if (!name) {
      return NextResponse.json(
        { error: 'Name ist erforderlich' },
        { status: 400 }
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
        userId: user.id,
        name,
        category
      }
    })
    console.log('Erstellter Händler:', merchant)

    return NextResponse.json(merchant)
  } catch (error) {
    console.error('Detaillierter Fehler beim Erstellen des Händlers:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fehler beim Erstellen des Händlers' },
      { status: 500 }
    )
  }
} 