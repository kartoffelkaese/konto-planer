'use server'

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params
  try {
    const session = await auth()
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

    const category = await prisma.category.findFirst({
      where: {
        id,
        userId: user.id
      },
      include: {
        merchants: true
      }
    })

    if (!category) {
      return NextResponse.json({ error: 'Kategorie nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json(category)
  } catch (error) {
    console.error('Detaillierter Fehler beim Laden der Kategorie:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Kategorie' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
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

    console.log('User bei PATCH:', user)

    const { name, color } = await request.json()
    console.log('Empfangene Daten:', { name, color })

    // Prüfe, ob der Name bereits existiert (außer für die aktuelle Kategorie)
    const existingCategory = await prisma.category.findFirst({
      where: {
        userId: user.id,
        name: name,
        NOT: {
          id
        }
      }
    })

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Eine Kategorie mit diesem Namen existiert bereits' },
        { status: 400 }
      )
    }

    const category = await prisma.category.update({
      where: {
        id,
        userId: user.id
      },
      data: {
        name,
        color
      }
    })

    console.log('Aktualisierte Kategorie:', category)
    return NextResponse.json(category)
  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren der Kategorie' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params
  try {
    const session = await auth()
    console.log('Session bei DELETE:', session)

    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    if (!session.user?.email) {
      return NextResponse.json({ error: 'Keine E-Mail-Adresse gefunden' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    console.log('User bei DELETE:', user)

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 })
    }

    // Überprüfen, ob die Kategorie existiert und dem Benutzer gehört
    const category = await prisma.category.findFirst({
      where: {
        id,
        userId: user.id
      },
      include: {
        _count: {
          select: { merchants: true }
        }
      }
    })

    if (!category) {
      return NextResponse.json({ error: 'Kategorie nicht gefunden' }, { status: 404 })
    }

    // Wenn die Kategorie noch Händler hat, diese auf "keine Kategorie" setzen
    if (category._count.merchants > 0) {
      await prisma.merchant.updateMany({
        where: {
          categoryId: id
        },
        data: {
          categoryId: null
        }
      })
    }

    // Kategorie löschen
    await prisma.category.delete({
      where: {
        id,
        userId: user.id
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Detaillierter Fehler beim Löschen der Kategorie:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fehler beim Löschen der Kategorie' },
      { status: 500 }
    )
  }
} 