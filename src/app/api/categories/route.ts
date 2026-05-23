'use server'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAccountContext } from '@/lib/account-context'
import { isErrorResponse } from '@/lib/api-auth'

export async function GET() {
  const ctx = await getAccountContext()
  if (isErrorResponse(ctx)) return ctx

  const { account } = ctx

  const categories = await prisma.category.findMany({
    where: {
      accountId: account.id,
    },
    include: {
      _count: {
        select: { merchants: true },
      },
    },
  })

  return NextResponse.json(categories)
}

export async function POST(request: Request) {
  const ctx = await getAccountContext()
  if (isErrorResponse(ctx)) return ctx

  const { account } = ctx

  const { name, color } = await request.json()

  if (!name || !color) {
    return NextResponse.json(
      { error: 'Name und Farbe sind Pflichtfelder' },
      { status: 400 }
    )
  }

  const existingCategory = await prisma.category.findFirst({
    where: {
      accountId: account.id,
      name: name,
    },
  })

  if (existingCategory) {
    return NextResponse.json(
      { error: 'Eine Kategorie mit diesem Namen existiert bereits' },
      { status: 400 }
    )
  }

  const category = await prisma.category.create({
    data: {
      name,
      color,
      accountId: account.id,
    },
  })

  return NextResponse.json(category)
}
