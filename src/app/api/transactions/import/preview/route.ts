import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAccountContext, requireWritableContext } from '@/lib/account-context'
import { isErrorResponse } from '@/lib/api-auth'
import { merchantCategoriesInclude } from '@/lib/merchantCategories'
import { parseCsv } from '@/lib/csvImport'
import { buildImportPreviewRows } from '@/lib/csvImport/buildPreview'

export async function POST(request: Request) {
  const ctx = await getAccountContext()
  if (isErrorResponse(ctx)) return ctx

  const writeError = requireWritableContext(ctx)
  if (writeError) return writeError

  const { account } = ctx

  try {
    const body = await request.json()
    const csvText = typeof body.csvText === 'string' ? body.csvText : ''

    if (!csvText.trim()) {
      return NextResponse.json(
        { error: 'CSV-Inhalt fehlt' },
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

    const existingTransactions = await prisma.transaction.findMany({
      where: {
        accountId: account.id,
        isRecurring: false,
      },
      select: {
        date: true,
        amount: true,
        merchantId: true,
        merchant: true,
      },
    })

    const previewRows = buildImportPreviewRows(
      parsedRows,
      merchantsForPreview,
      existingTransactions
    )

    const summary = {
      total: previewRows.length,
      duplicates: previewRows.filter((r) => r.isDuplicate).length,
      errors: previewRows.filter((r) => r.errors.length > 0).length,
      suggested: previewRows.filter((r) => r.suggestedIncluded).length,
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
    const message =
      error instanceof Error ? error.message : 'Fehler beim Einlesen der CSV-Datei'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
