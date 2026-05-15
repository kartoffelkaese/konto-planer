'use server'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  getUserBySession,
  assertCategoryOwned,
  isErrorResponse,
} from '@/lib/api-auth'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult

  try {
    const merchant = await prisma.merchant.findFirst({
      where: {
        id,
        userId: user.id,
      },
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

  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult

  const { name, categoryId } = await request.json()

  if (!name) {
    return NextResponse.json(
      { error: 'Name ist ein Pflichtfeld' },
      { status: 400 }
    )
  }

  const existingMerchant = await prisma.merchant.findFirst({
    where: {
      userId: user.id,
      name: name,
      NOT: {
        id,
      },
    },
  })

  if (existingMerchant) {
    return NextResponse.json(
      { error: 'Ein Händler mit diesem Namen existiert bereits' },
      { status: 400 }
    )
  }

  const categoryError = await assertCategoryOwned(categoryId, user.id)
  if (categoryError) return categoryError

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
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult

  await prisma.merchant.delete({
    where: {
      id,
      userId: user.id,
    },
  })

  return new Response(null, { status: 204 })
}
