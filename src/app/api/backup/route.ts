import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PrismaClient, Prisma } from '@prisma/client'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    // Hole alle Daten des Benutzers
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        categories: true,
        merchants: true,
        transactions: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 })
    }

    // Erstelle Backup-Objekt
    const backup = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      user: {
        email: user.email,
        salaryDay: user.salaryDay,
        accountName: user.accountName
      },
      categories: user.categories,
      merchants: user.merchants,
      transactions: user.transactions
    }

    return NextResponse.json(backup)
  } catch (error) {
    console.error('Fehler beim Erstellen des Backups:', error)
    return NextResponse.json({ error: 'Interner Server-Fehler' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const backup = await request.json()

    // Validiere Backup-Format
    if (!backup.version || !backup.categories || !backup.merchants || !backup.transactions) {
      return NextResponse.json({ error: 'Ungültiges Backup-Format' }, { status: 400 })
    }

    // Starte Transaktion für atomare Operation
    await prisma.$transaction(async (tx) => {
      // Lösche existierende Daten
      await tx.transaction.deleteMany({
        where: { userId: session.user.id }
      })
      await tx.merchant.deleteMany({
        where: { userId: session.user.id }
      })
      await tx.category.deleteMany({
        where: { userId: session.user.id }
      })

      // Erstelle neue Kategorien
      const categoryMap = new Map()
      for (const category of backup.categories) {
        const newCategory = await tx.category.create({
          data: {
            name: category.name,
            color: category.color,
            userId: session.user.id
          }
        })
        categoryMap.set(category.id, newCategory.id)
      }

      // Erstelle neue Händler
      const merchantMap = new Map()
      for (const merchant of backup.merchants) {
        const newMerchant = await tx.merchant.create({
          data: {
            name: merchant.name,
            categoryId: categoryMap.get(merchant.categoryId),
            userId: session.user.id
          }
        })
        merchantMap.set(merchant.id, newMerchant.id)
      }

      // Erstelle neue Transaktionen
      for (const transaction of backup.transactions) {
        await tx.transaction.create({
          data: {
            amount: transaction.amount,
            date: new Date(transaction.date),
            description: transaction.description,
            isConfirmed: transaction.isConfirmed,
            isRecurring: transaction.isRecurring,
            recurringInterval: transaction.recurringInterval,
            lastConfirmedDate: transaction.lastConfirmedDate ? new Date(transaction.lastConfirmedDate) : null,
            merchant: transaction.merchant,
            merchantId: merchantMap.get(transaction.merchantId),
            userId: session.user.id
          }
        })
      }
    })

    return NextResponse.json({ message: 'Backup erfolgreich wiederhergestellt' })
  } catch (error) {
    console.error('Fehler beim Wiederherstellen des Backups:', error)
    return NextResponse.json({ error: 'Interner Server-Fehler' }, { status: 500 })
  }
} 