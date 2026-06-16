import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserBySession, isErrorResponse } from '@/lib/api-auth'
import {
  requireSplitListAccess,
  requireSplitListWrite,
} from '@/lib/splitAccess'
import { serializeCategory } from '@/lib/splitSerialize'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const access = await requireSplitListAccess(authResult.user.id, id)
  if (access instanceof NextResponse) return access

  const categories = await prisma.splitCategory.findMany({
    where: { splitListId: id },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json(categories.map(serializeCategory))
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const access = await requireSplitListAccess(authResult.user.id, id)
  if (access instanceof NextResponse) return access

  const writeError = requireSplitListWrite(access)
  if (writeError) return writeError

  let body: { name?: string; color?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
  }

  const name = body.name?.trim()
  if (!name) {
    return NextResponse.json({ error: 'Name ist erforderlich' }, { status: 400 })
  }

  const existing = await prisma.splitCategory.findFirst({
    where: { splitListId: id, name },
  })
  if (existing) {
    return NextResponse.json(
      { error: 'Kategorie existiert bereits' },
      { status: 400 }
    )
  }

  const count = await prisma.splitCategory.count({ where: { splitListId: id } })

  const category = await prisma.splitCategory.create({
    data: {
      splitListId: id,
      name,
      color: body.color?.trim() || null,
      sortOrder: count,
    },
  })

  return NextResponse.json(serializeCategory(category), { status: 201 })
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const access = await requireSplitListAccess(authResult.user.id, id)
  if (access instanceof NextResponse) return access

  const writeError = requireSplitListWrite(access)
  if (writeError) return writeError

  let body: {
    categoryId?: string
    name?: string
    color?: string | null
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
  }

  if (!body.categoryId) {
    return NextResponse.json(
      { error: 'categoryId ist erforderlich' },
      { status: 400 }
    )
  }

  const category = await prisma.splitCategory.findFirst({
    where: { id: body.categoryId, splitListId: id },
  })
  if (!category) {
    return NextResponse.json({ error: 'Kategorie nicht gefunden' }, { status: 404 })
  }

  const name = body.name?.trim()
  if (name && name !== category.name) {
    const duplicate = await prisma.splitCategory.findFirst({
      where: { splitListId: id, name, NOT: { id: category.id } },
    })
    if (duplicate) {
      return NextResponse.json(
        { error: 'Kategorie existiert bereits' },
        { status: 400 }
      )
    }
  }

  const updated = await prisma.splitCategory.update({
    where: { id: category.id },
    data: {
      ...(name ? { name } : {}),
      ...(body.color !== undefined ? { color: body.color?.trim() || null } : {}),
    },
  })

  return NextResponse.json(serializeCategory(updated))
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const access = await requireSplitListAccess(authResult.user.id, id)
  if (access instanceof NextResponse) return access

  const writeError = requireSplitListWrite(access)
  if (writeError) return writeError

  let body: { categoryId?: string; reassignToCategoryId?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
  }

  if (!body.categoryId) {
    return NextResponse.json(
      { error: 'categoryId ist erforderlich' },
      { status: 400 }
    )
  }

  const category = await prisma.splitCategory.findFirst({
    where: { id: body.categoryId, splitListId: id },
  })
  if (!category) {
    return NextResponse.json({ error: 'Kategorie nicht gefunden' }, { status: 404 })
  }

  if (body.reassignToCategoryId) {
    const target = await prisma.splitCategory.findFirst({
      where: { id: body.reassignToCategoryId, splitListId: id },
    })
    if (!target) {
      return NextResponse.json(
        { error: 'Zielkategorie nicht gefunden' },
        { status: 400 }
      )
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.splitExpense.updateMany({
      where: { splitListId: id, categoryId: category.id },
      data: { categoryId: body.reassignToCategoryId ?? null },
    })
    await tx.splitCategory.delete({ where: { id: category.id } })
  })

  return NextResponse.json({ message: 'Kategorie gelöscht' })
}
