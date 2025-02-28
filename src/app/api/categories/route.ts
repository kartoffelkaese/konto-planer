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

    const categories = await prisma.category.findMany({
      where: { userId: user.id },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { merchants: true }
        }
      }
    })
    console.log('Categories:', categories)

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Detaillierter Fehler beim Laden der Kategorien:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Kategorien' },
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

    const { name, color } = await request.json()
    console.log('Empfangene Daten:', { name, color })

    if (!name) {
      return NextResponse.json(
        { error: 'Name ist erforderlich' },
        { status: 400 }
      )
    }

    const existingCategory = await prisma.category.findFirst({
      where: {
        userId: user.id,
        name: name
      }
    })

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Eine Kategorie mit diesem Namen existiert bereits' },
        { status: 400 }
      )
    }

    const category = await prisma.category.create({
      data: {
        userId: user.id,
        name,
        color: color || '#A7C7E7' // Verwende die übergebene Farbe oder die Standardfarbe
      }
    })
    console.log('Erstellte Kategorie:', category)

    return NextResponse.json(category)
  } catch (error) {
    console.error('Detaillierter Fehler beim Erstellen der Kategorie:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fehler beim Erstellen der Kategorie' },
      { status: 500 }
    )
  }
} 