'use server'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAccountContext } from '@/lib/account-context'
import { isErrorResponse } from '@/lib/api-auth'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params
  try {
    const ctx = await getAccountContext()
    if (isErrorResponse(ctx)) return ctx

    const { account } = ctx

    const category = await prisma.category.findFirst({
      where: {
        id,
        accountId: account.id,
      },
      include: {
        merchants: {
          include: { merchant: true },
        },
      },
    })

    if (!category) {
      return NextResponse.json({ error: 'Kategorie nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json(category)
  } catch (error) {
    console.error('Fehler beim Laden der Kategorie:', error)
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

  const ctx = await getAccountContext()
  if (isErrorResponse(ctx)) return ctx

  const { account } = ctx

  try {
    const { name, color } = await request.json()

    const existingCategory = await prisma.category.findFirst({
      where: {
        accountId: account.id,
        name: name,
        NOT: {
          id,
        },
      },
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
        accountId: account.id,
      },
      data: {
        name,
        color,
      },
    })

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
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params
  try {
    const ctx = await getAccountContext()
    if (isErrorResponse(ctx)) return ctx

    const { account } = ctx

    const category = await prisma.category.findFirst({
      where: {
        id,
        accountId: account.id,
      },
      include: {
        _count: {
          select: { merchants: true },
        },
      },
    })

    if (!category) {
      return NextResponse.json({ error: 'Kategorie nicht gefunden' }, { status: 404 })
    }

    await prisma.category.delete({
      where: {
        id,
        accountId: account.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Fehler beim Löschen der Kategorie:', error)
    return NextResponse.json(
      { error: 'Fehler beim Löschen der Kategorie' },
      { status: 500 }
    )
  }
}
