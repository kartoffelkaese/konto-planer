import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAccountContext, requireWritableContext } from '@/lib/account-context'
import { isErrorResponse } from '@/lib/api-auth'
import { resolveMerchantForTransaction } from '@/lib/resolveMerchantForTransaction'
import {
  applyTransactionCategoryOnSave,
  validateTransactionCategoryId,
} from '@/lib/transactionCategory'
import type { ImportCommitRow } from '@/lib/csvImport/types'
import { CSV_IMPORT_MAX_ROWS } from '@/lib/csvImport/types'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

type CommitBody = {
  rows?: ImportCommitRow[]
}

function parseCommitRow(raw: unknown): ImportCommitRow | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const rowIndex = typeof row.rowIndex === 'number' ? row.rowIndex : 0

  const confirmExistingId =
    typeof row.confirmExistingId === 'string' && row.confirmExistingId.trim()
      ? row.confirmExistingId.trim()
      : null

  if (confirmExistingId) {
    return { rowIndex, confirmExistingId }
  }

  if (typeof row.date !== 'string' || !row.date) return null
  if (typeof row.amount !== 'number' || Number.isNaN(row.amount)) return null
  if (typeof row.isConfirmed !== 'boolean') return null

  const merchantId =
    typeof row.merchantId === 'string' && row.merchantId ? row.merchantId : null
  const merchant =
    typeof row.merchant === 'string' && row.merchant.trim()
      ? row.merchant.trim()
      : null

  if (!merchantId && !merchant) return null

  return {
    rowIndex,
    date: row.date,
    amount: row.amount,
    description:
      typeof row.description === 'string'
        ? row.description
        : row.description === null
          ? null
          : null,
    merchantId,
    merchant,
    createNewMerchant: row.createNewMerchant === true,
    categoryId:
      typeof row.categoryId === 'string'
        ? row.categoryId
        : row.categoryId === null
          ? null
          : undefined,
    isConfirmed: row.isConfirmed,
  }
}

export async function POST(request: Request) {
  const ctx = await getAccountContext()
  if (isErrorResponse(ctx)) return ctx

  const writeError = requireWritableContext(ctx)
  if (writeError) return writeError

  const { account, user } = ctx

  const { allowed } = checkRateLimit(
    `csv-commit:${user.id}`,
    RATE_LIMITS.csvImport
  )
  if (!allowed) {
    return NextResponse.json(
      { error: 'Zu viele Import-Versuche. Bitte später erneut versuchen.' },
      { status: 429 }
    )
  }

  try {
    const body = (await request.json()) as CommitBody
    const rawRows = Array.isArray(body.rows) ? body.rows : []

    if (rawRows.length === 0) {
      return NextResponse.json(
        { error: 'Keine Zeilen zum Importieren' },
        { status: 400 }
      )
    }

    if (rawRows.length > CSV_IMPORT_MAX_ROWS) {
      return NextResponse.json(
        { error: `Zu viele Zeilen (max. ${CSV_IMPORT_MAX_ROWS} pro Import)` },
        { status: 400 }
      )
    }

    const rows = rawRows
      .map(parseCommitRow)
      .filter((r): r is ImportCommitRow => r !== null)

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Keine gültigen Importzeilen' },
        { status: 400 }
      )
    }

    const errors: Array<{ rowIndex: number; message: string }> = []
    let created = 0
    let confirmed = 0

    for (const row of rows) {
      if (row.confirmExistingId) {
        const existing = await prisma.transaction.findFirst({
          where: {
            id: row.confirmExistingId,
            accountId: account.id,
            isRecurring: false,
          },
          select: {
            id: true,
            date: true,
            amount: true,
            merchantId: true,
            merchant: true,
            isConfirmed: true,
          },
        })

        if (!existing) {
          errors.push({
            rowIndex: row.rowIndex,
            message: 'Transaktion nicht gefunden',
          })
          continue
        }

        if (existing.isConfirmed) {
          errors.push({
            rowIndex: row.rowIndex,
            message: 'Transaktion ist bereits gebucht',
          })
          continue
        }

        await prisma.transaction.update({
          where: { id: existing.id },
          data: { isConfirmed: true },
        })

        confirmed++
        continue
      }

      const categoryValidation = await validateTransactionCategoryId(
        row.categoryId,
        account.id
      )
      if (categoryValidation.error) {
        errors.push({
          rowIndex: row.rowIndex,
          message: 'Ungültige Kategorie',
        })
        continue
      }

      const resolvedMerchant = await resolveMerchantForTransaction(account.id, {
        merchantId: row.merchantId,
        merchant: row.merchantId ? undefined : row.merchant,
        createNewMerchant: row.createNewMerchant,
      })

      if (resolvedMerchant.error) {
        errors.push({
          rowIndex: row.rowIndex,
          message: 'Händler konnte nicht zugeordnet werden',
        })
        continue
      }

      const transactionDate = new Date(`${row.date}T12:00:00`)
      if (Number.isNaN(transactionDate.getTime())) {
        errors.push({
          rowIndex: row.rowIndex,
          message: 'Ungültiges Datum',
        })
        continue
      }

      const createdTx = await prisma.transaction.create({
        data: {
          accountId: account.id,
          merchant: resolvedMerchant.merchant,
          merchantId: resolvedMerchant.merchantId,
          description: row.description ?? null,
          amount: row.amount!,
          date: transactionDate,
          categoryId: categoryValidation.categoryId ?? null,
          isConfirmed: row.isConfirmed!,
          isRecurring: false,
        },
      })

      await applyTransactionCategoryOnSave(prisma, {
        merchantId: createdTx.merchantId,
        categoryId: createdTx.categoryId,
      })

      created++
    }

    return NextResponse.json({
      created,
      confirmed,
      skipped: rows.length - created - confirmed - errors.length,
      errors,
    })
  } catch (error) {
    console.error('CSV import error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Importieren der Transaktionen' },
      { status: 500 }
    )
  }
}
