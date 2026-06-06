'use server'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAccountContext, requireWritableContext } from '@/lib/account-context'
import {
  assertCategoryOwned,
  isErrorResponse,
} from '@/lib/api-auth'
import {
  merchantCategoriesInclude,
  normalizeCategoryIds,
  serializeMerchant,
  setMerchantCategories,
} from '@/lib/merchantCategories'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const ctx = await getAccountContext()
  if (isErrorResponse(ctx)) return ctx

  const { account } = ctx

  try {
    const merchant = await prisma.merchant.findFirst({
      where: {
        id,
        accountId: account.id,
      },
      include: merchantCategoriesInclude,
    })

    if (!merchant) {
      return NextResponse.json({ error: 'Händler nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json(serializeMerchant(merchant))
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

  const ctx = await getAccountContext()
  if (isErrorResponse(ctx)) return ctx

  const writeError = requireWritableContext(ctx)
  if (writeError) return writeError

  const { account } = ctx

  const body = await request.json()
  const { name, categoryId, categoryIds: rawCategoryIds } = body
  const categoryIds =
    rawCategoryIds !== undefined || categoryId !== undefined
      ? normalizeCategoryIds(rawCategoryIds, categoryId)
      : undefined

  if (!name) {
    return NextResponse.json(
      { error: 'Name ist ein Pflichtfeld' },
      { status: 400 }
    )
  }

  const existingMerchant = await prisma.merchant.findFirst({
    where: {
      accountId: account.id,
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

  if (categoryIds !== undefined) {
    for (const catId of categoryIds) {
      const categoryError = await assertCategoryOwned(catId, account.id)
      if (categoryError) return categoryError
    }
  }

  const merchant = await prisma.$transaction(async (tx) => {
    await tx.merchant.update({
      where: {
        id,
        accountId: account.id,
      },
      data: { name },
    })

    if (categoryIds !== undefined) {
      await setMerchantCategories(tx, id, categoryIds)
    }

    return tx.merchant.findUniqueOrThrow({
      where: { id },
      include: merchantCategoriesInclude,
    })
  })

  return NextResponse.json(serializeMerchant(merchant))
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const ctx = await getAccountContext()
  if (isErrorResponse(ctx)) return ctx

  const writeError = requireWritableContext(ctx)
  if (writeError) return writeError

  const { account } = ctx

  await prisma.merchant.delete({
    where: {
      id,
      accountId: account.id,
    },
  })

  return new Response(null, { status: 204 })
}
