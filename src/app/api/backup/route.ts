import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAccountContext } from '@/lib/account-context'
import { isErrorResponse } from '@/lib/api-auth'
import {
  BACKUP_MAX_BYTES,
  validateBackupPayload,
} from '@/lib/backup-validation'

export async function GET() {
  try {
    const ctx = await getAccountContext()
    if (isErrorResponse(ctx)) return ctx

    const { account, user } = ctx

    const [categories, merchants, transactions] = await Promise.all([
      prisma.category.findMany({ where: { accountId: account.id } }),
      prisma.merchant.findMany({ where: { accountId: account.id } }),
      prisma.transaction.findMany({ where: { accountId: account.id } }),
    ])

    const backup = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      user: {
        email: user.email,
        salaryDay: account.salaryDay,
        accountName: account.name,
      },
      categories,
      merchants,
      transactions,
    }

    return NextResponse.json(backup)
  } catch (error) {
    console.error('Fehler beim Erstellen des Backups:', error)
    return NextResponse.json({ error: 'Interner Server-Fehler' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getAccountContext()
    if (isErrorResponse(ctx)) return ctx

    const { account } = ctx

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
        isRecurringPaused?: boolean
        recurringInterval?: string | null
        lastConfirmedDate?: string | null
        merchant: string
        merchantId: string | null
      }>
    }

    await prisma.$transaction(async (tx) => {
      await tx.transaction.deleteMany({
        where: { accountId: account.id },
      })
      await tx.merchant.deleteMany({
        where: { accountId: account.id },
      })
      await tx.category.deleteMany({
        where: { accountId: account.id },
      })

      const categoryMap = new Map<string, string>()
      for (const category of b.categories) {
        const newCategory = await tx.category.create({
          data: {
            name: category.name,
            color: category.color,
            accountId: account.id,
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
            accountId: account.id,
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
            isRecurringPaused: transaction.isRecurringPaused ?? false,
            recurringInterval: transaction.recurringInterval,
            lastConfirmedDate: transaction.lastConfirmedDate
              ? new Date(transaction.lastConfirmedDate)
              : null,
            merchant: transaction.merchant,
            merchantId: transaction.merchantId
              ? merchantMap.get(transaction.merchantId) ?? null
              : null,
            accountId: account.id,
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
