import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserBySession, isErrorResponse } from '@/lib/api-auth'
import {
  BACKUP_MAX_BYTES,
  validateBackupPayload,
} from '@/lib/backup-validation'

export async function GET() {
  try {
    const authResult = await getUserBySession()
    if (isErrorResponse(authResult)) return authResult

    const { email } = authResult

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        categories: true,
        merchants: true,
        transactions: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 })
    }

    const backup = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      user: {
        email: user.email,
        salaryDay: user.salaryDay,
        accountName: user.accountName,
      },
      categories: user.categories,
      merchants: user.merchants,
      transactions: user.transactions,
    }

    return NextResponse.json(backup)
  } catch (error) {
    console.error('Fehler beim Erstellen des Backups:', error)
    return NextResponse.json({ error: 'Interner Server-Fehler' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await getUserBySession()
    if (isErrorResponse(authResult)) return authResult

    const { user } = authResult

    const contentLength = request.headers.get('content-length')
    const bodyByteLength = contentLength ? parseInt(contentLength, 10) : undefined
    if (bodyByteLength !== undefined && bodyByteLength > BACKUP_MAX_BYTES) {
      return NextResponse.json(
        { error: 'Backup-Datei ist zu groß' },
        { status: 400 }
      )
    }

    const rawText = await request.text()
    if (rawText.length > BACKUP_MAX_BYTES) {
      return NextResponse.json(
        { error: 'Backup-Datei ist zu groß' },
        { status: 400 }
      )
    }

    let backup: unknown
    try {
      backup = JSON.parse(rawText)
    } catch {
      return NextResponse.json(
        { error: 'Ungültiges Backup-Format' },
        { status: 400 }
      )
    }

    const validationError = validateBackupPayload(backup, rawText.length)
    if (validationError) return validationError

    const b = backup as {
      categories: Array<{ id: string; name: string; color: string }>
      merchants: Array<{ id: string; name: string; categoryId: string | null }>
      transactions: Array<{
        id: string
        amount: unknown
        date: string
        description?: string | null
        isConfirmed: boolean
        isRecurring: boolean
        recurringInterval?: string | null
        lastConfirmedDate?: string | null
        merchant: string
        merchantId: string | null
      }>
    }

    await prisma.$transaction(async (tx) => {
      await tx.transaction.deleteMany({
        where: { userId: user.id },
      })
      await tx.merchant.deleteMany({
        where: { userId: user.id },
      })
      await tx.category.deleteMany({
        where: { userId: user.id },
      })

      const categoryMap = new Map<string, string>()
      for (const category of b.categories) {
        const newCategory = await tx.category.create({
          data: {
            name: category.name,
            color: category.color,
            userId: user.id,
          },
        })
        categoryMap.set(category.id, newCategory.id)
      }

      const merchantMap = new Map<string, string>()
      for (const merchant of b.merchants) {
        const newMerchant = await tx.merchant.create({
          data: {
            name: merchant.name,
            categoryId: merchant.categoryId
              ? categoryMap.get(merchant.categoryId) ?? null
              : null,
            userId: user.id,
          },
        })
        merchantMap.set(merchant.id, newMerchant.id)
      }

      for (const transaction of b.transactions) {
        await tx.transaction.create({
          data: {
            amount: Number(transaction.amount),
            date: new Date(transaction.date),
            description: transaction.description,
            isConfirmed: transaction.isConfirmed,
            isRecurring: transaction.isRecurring,
            recurringInterval: transaction.recurringInterval,
            lastConfirmedDate: transaction.lastConfirmedDate
              ? new Date(transaction.lastConfirmedDate)
              : null,
            merchant: transaction.merchant,
            merchantId: transaction.merchantId
              ? merchantMap.get(transaction.merchantId) ?? null
              : null,
            userId: user.id,
          },
        })
      }
    })

    return NextResponse.json({ message: 'Backup erfolgreich wiederhergestellt' })
  } catch (error) {
    console.error('Fehler beim Wiederherstellen des Backups:', error)
    return NextResponse.json({ error: 'Interner Server-Fehler' }, { status: 500 })
  }
}
