'use server'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAccountContext } from '@/lib/account-context'
import {
  assertCategoryOwned,
  isErrorResponse,
} from '@/lib/api-auth'

export async function GET() {
  try {
    const ctx = await getAccountContext()
    if (isErrorResponse(ctx)) return ctx

    const { account } = ctx

    const merchants = await prisma.merchant.findMany({
      where: {
        accountId: account.id,
      },
      include: {
        category: true,
      },
    })

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
    const ctx = await getAccountContext()
    if (isErrorResponse(ctx)) return ctx

    const { account } = ctx

    const { name, categoryId } = await request.json()

    if (!name) {
      return new Response(
        JSON.stringify({ error: 'Name ist ein Pflichtfeld' }),
        {
          status: 400,
        }
      )
    }

    const categoryError = await assertCategoryOwned(categoryId, account.id)
    if (categoryError) return categoryError

    const existingMerchant = await prisma.merchant.findFirst({
      where: {
        accountId: account.id,
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
        name,
        categoryId,
        accountId: account.id,
      },
      include: {
        category: true,
      }
    })

    return NextResponse.json(merchant)
  } catch (error) {
    console.error('Detaillierter Fehler beim Erstellen des Händlers:', error)
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Händlers' },
      { status: 500 }
    )
  }
} 