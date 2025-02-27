'use server'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

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
        id: params.id,
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
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

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

    const { name, description, category } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: 'Name ist erforderlich' },
        { status: 400 }
      )
    }

    const existingMerchant = await prisma.merchant.findFirst({
      where: {
        userId: user.id,
        name: name,
        NOT: {
          id: params.id
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
        id: params.id,
        userId: user.id
      },
      data: {
        name,
        description,
        category
      }
    })

    return NextResponse.json(merchant)
  } catch (error) {
    console.error('Error updating merchant:', error)
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren des Händlers' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

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
        id: params.id,
        userId: user.id
      }
    })

    if (!merchant) {
      return NextResponse.json({ error: 'Händler nicht gefunden' }, { status: 404 })
    }

    await prisma.merchant.delete({
      where: {
        id: params.id,
        userId: user.id
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting merchant:', error)
    return NextResponse.json(
      { error: 'Fehler beim Löschen des Händlers' },
      { status: 500 }
    )
  }
} 