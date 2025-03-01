'use server'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function POST() {
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

    // Hole alle Transaktionen ohne merchantId
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        merchantId: null
      }
    })

    let updated = 0
    let errors = 0

    // Für jede Transaktion
    for (const transaction of transactions) {
      try {
        // Suche nach einem passenden Händler
        const merchant = await prisma.merchant.findFirst({
          where: {
            userId: user.id,
            name: transaction.merchant
          }
        })

        if (merchant) {
          // Verknüpfe die Transaktion mit dem Händler
          await prisma.transaction.update({
            where: { id: transaction.id },
            data: { merchantId: merchant.id }
          })
          updated++
        }
      } catch (err) {
        console.error(`Fehler beim Verknüpfen von Transaktion ${transaction.id}:`, err)
        errors++
      }
    }

    return NextResponse.json({
      message: `${updated} Transaktionen verknüpft, ${errors} Fehler`,
      updated,
      errors
    })
  } catch (error) {
    console.error('Error linking merchants:', error)
    return NextResponse.json(
      { error: 'Fehler beim Verknüpfen der Händler' },
      { status: 500 }
    )
  }
} 