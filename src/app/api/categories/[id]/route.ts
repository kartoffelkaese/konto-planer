import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAccountContext, requireWritableContext } from '@/lib/account-context'
import {
  isErrorResponse,
  readJsonBody,
} from '@/lib/api-auth'
import { logger } from '@/lib/logger'

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
    logger.error('Fehler beim Laden der Kategorie', error, { endpoint: '/api/categories/:id' })
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

  const writeError = requireWritableContext(ctx)
  if (writeError) return writeError

  const { account } = ctx

  try {
    const body = await readJsonBody<{ name?: string; color?: string }>(request)
    if (isErrorResponse(body)) return body
    const { name, color } = body

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
    logger.error('Error updating category', error, { endpoint: '/api/categories/:id' })
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

    const writeError = requireWritableContext(ctx)
    if (writeError) return writeError

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
    logger.error('Fehler beim Löschen der Kategorie', error, { endpoint: '/api/categories/:id' })
    return NextResponse.json(
      { error: 'Fehler beim Löschen der Kategorie' },
      { status: 500 }
    )
  }
}
