'use server'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  getUserBySession,
  assertCategoryOwned,
  isErrorResponse,
} from '@/lib/api-auth'

export async function GET() {
  try {
    const authResult = await getUserBySession()
    if (isErrorResponse(authResult)) return authResult

    const { user } = authResult

    const merchants = await prisma.merchant.findMany({
      where: {
        userId: user.id,
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
    const authResult = await getUserBySession()
    if (isErrorResponse(authResult)) return authResult

    const { user } = authResult

    const { name, categoryId } = await request.json()

    if (!name) {
      return new Response(
        JSON.stringify({ error: 'Name ist ein Pflichtfeld' }),
        {
          status: 400,
        }
      )
    }

    const categoryError = await assertCategoryOwned(categoryId, user.id)
    if (categoryError) return categoryError

    const existingMerchant = await prisma.merchant.findFirst({
      where: {
        userId: user.id,
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
        userId: user.id,
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