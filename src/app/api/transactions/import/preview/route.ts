import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAccountContext, requireWritableContext } from '@/lib/account-context'
import { isErrorResponse } from '@/lib/api-auth'
import { merchantCategoriesInclude } from '@/lib/merchantCategories'
import { parseCsv, CsvParseError } from '@/lib/csvImport'
import { buildImportPreviewRows } from '@/lib/csvImport/buildPreview'
import {
  getImportDateRange,
  toImportDateRangeIso,
} from '@/lib/csvImport/dateRange'
import { CSV_IMPORT_MAX_BYTES } from '@/lib/csvImport/types'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

export async function POST(request: Request) {
  const ctx = await getAccountContext()
  if (isErrorResponse(ctx)) return ctx

  const writeError = requireWritableContext(ctx)
  if (writeError) return writeError

  const { account, user } = ctx

  const { allowed } = checkRateLimit(
    `csv-preview:${user.id}`,
    RATE_LIMITS.csvImport
  )
  if (!allowed) {
    return NextResponse.json(
      { error: 'Zu viele Import-Versuche. Bitte später erneut versuchen.' },
      { status: 429 }
    )
  }

  const contentLength = request.headers.get('content-length')
  if (contentLength && parseInt(contentLength, 10) > CSV_IMPORT_MAX_BYTES) {
    return NextResponse.json(
      { error: 'CSV-Datei ist zu groß (max. 2 MB)' },
      { status: 400 }
    )
  }

  try {
    const body = await request.json()
    const csvText = typeof body.csvText === 'string' ? body.csvText : ''

    if (!csvText.trim()) {
      return NextResponse.json(
        { error: 'CSV-Inhalt fehlt' },
        { status: 400 }
      )
    }

    if (csvText.length > CSV_IMPORT_MAX_BYTES) {
      return NextResponse.json(
        { error: 'CSV-Datei ist zu groß (max. 2 MB)' },
        { status: 400 }
      )
    }

    const { formatId, rows: parsedRows } = parseCsv(csvText)

    const merchants = await prisma.merchant.findMany({
      where: { accountId: account.id },
      include: merchantCategoriesInclude,
      orderBy: { name: 'asc' },
    })

    const merchantsForPreview = merchants.map((m) => ({
      id: m.id,
      name: m.name,
      categoryIds: m.categories.map((c) => c.categoryId),
      categories: m.categories.map((c) => ({ id: c.categoryId })),
    }))

    const dateRange = getImportDateRange(parsedRows, csvText)

    const existingTransactions = await prisma.transaction.findMany({
      where: {
        accountId: account.id,
        isRecurring: false,
        ...(dateRange && {
          date: { gte: dateRange.start, lte: dateRange.end },
        }),
      },
      select: {
        id: true,
        date: true,
        amount: true,
        merchantId: true,
        merchant: true,
        isConfirmed: true,
        parentTransactionId: true,
      },
    })

    let recurringTemplates: Array<{
      id: string
      date: Date
      amount: { toString(): string }
      merchantId: string | null
      merchant: string
      recurringInterval: string | null
    }> = []
    let recurringInstances = existingTransactions

    if (!account.isSimpleAccount) {
      recurringTemplates = await prisma.transaction.findMany({
        where: {
          accountId: account.id,
          isRecurring: true,
          isRecurringPaused: false,
          parentTransactionId: null,
        },
        select: {
          id: true,
          date: true,
          amount: true,
          merchantId: true,
          merchant: true,
          recurringInterval: true,
        },
      })

      recurringInstances = await prisma.transaction.findMany({
        where: {
          accountId: account.id,
          isRecurring: false,
          parentTransactionId: { not: null },
          ...(dateRange && {
            date: { gte: dateRange.start, lte: dateRange.end },
          }),
        },
        select: {
          id: true,
          date: true,
          amount: true,
          merchantId: true,
          merchant: true,
          isConfirmed: true,
          parentTransactionId: true,
        },
      })
    }

    const previewRows = buildImportPreviewRows(
      parsedRows,
      merchantsForPreview,
      existingTransactions,
      {
        enableRecurringMatch: !account.isSimpleAccount,
        salaryDay: account.salaryDay,
        recurringTemplates,
        recurringInstances,
      }
    )

    const summary = {
      total: previewRows.length,
      duplicates: previewRows.filter((r) => r.isDuplicate).length,
      recurring: previewRows.filter((r) => r.isRecurringMatch).length,
      errors: previewRows.filter((r) => r.errors.length > 0).length,
      suggested: previewRows.filter((r) => r.suggestedIncluded).length,
      confirmable: previewRows.filter(
        (r) => r.canConfirmDuplicate || r.canConfirmRecurring
      ).length,
      dateRange: toImportDateRangeIso(dateRange),
    }

    return NextResponse.json({
      formatId,
      rows: previewRows,
      merchants: merchants.map((m) => ({
        id: m.id,
        name: m.name,
        categoryIds: m.categories.map((c) => c.categoryId),
        categories: m.categories.map((c) => ({
          id: c.category.id,
          name: c.category.name,
          color: c.category.color,
        })),
      })),
      summary,
    })
  } catch (error) {
    console.error('CSV preview error:', error)
    // Nur bewusst nutzergerichtete Parse-Fehler durchreichen, keine internen Details
    const message =
      error instanceof CsvParseError
        ? error.message
        : 'Fehler beim Einlesen der CSV-Datei'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
