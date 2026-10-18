import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAccountContext, requireWritableContext } from '@/lib/account-context'
import { isErrorResponse, readJsonBody } from '@/lib/api-auth'
import { assertRecurringNotAllowed } from '@/lib/simpleAccount'
import { merchantCategoriesInclude } from '@/lib/merchantCategories'
import {
  CsvParseError,
  getCsvFormatById,
  getCsvFormatForBank,
  listCsvFormats,
  parseCsv,
} from '@/lib/csvImport'
import { CSV_IMPORT_MAX_BYTES, type CsvImportFormatId } from '@/lib/csvImport/types'
import { getExportPeriodEnd, getImportDateRange, toImportDateRangeIso } from '@/lib/csvImport/dateRange'
import { detectRecurringPayments } from '@/lib/recurringDetection'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

/**
 * Wertet einen Kontoauszug (CSV) aus und schlägt wiederkehrende Zahlungen vor.
 * Die Datei wird nur gelesen, nichts wird gespeichert. Für alle Level – angelegt wird erst
 * über `POST /api/transactions/recurring/bulk`.
 */
export async function POST(request: Request) {
  const ctx = await getAccountContext()
  if (isErrorResponse(ctx)) return ctx

  const writeError = requireWritableContext(ctx)
  if (writeError) return writeError

  const { account, user } = ctx
  const planningError = assertRecurringNotAllowed(account)
  if (planningError) return planningError

  if (!checkRateLimit(`recurring-detect:${user.id}`, RATE_LIMITS.recurringDetect).allowed) {
    return NextResponse.json(
      { error: 'Zu viele Auswertungen. Bitte versuche es später erneut.' },
      { status: 429 }
    )
  }

  const contentLength = request.headers.get('content-length')
  if (contentLength && parseInt(contentLength, 10) > CSV_IMPORT_MAX_BYTES) {
    return NextResponse.json({ error: 'Die Datei ist zu groß (max. 2 MB).' }, { status: 400 })
  }

  const body = await readJsonBody<{ csvText?: unknown; formatId?: unknown }>(request)
  if (isErrorResponse(body)) return body

  const csvText = typeof body.csvText === 'string' ? body.csvText : ''
  if (!csvText.trim()) {
    return NextResponse.json({ error: 'Die Datei ist leer.' }, { status: 400 })
  }
  if (csvText.length > CSV_IMPORT_MAX_BYTES) {
    return NextResponse.json({ error: 'Die Datei ist zu groß (max. 2 MB).' }, { status: 400 })
  }

  const formatId = listCsvFormats().find((f) => f.id === body.formatId)?.id as
    | CsvImportFormatId
    | undefined
  // Ohne unterstützte Bank am Konto wählt man das Format im Assistenten selbst
  if (!formatId && !getCsvFormatForBank(account.bankId)) {
    return NextResponse.json(
      {
        error: 'Bitte wähle, von welcher Bank der Kontoauszug stammt.',
        code: 'FORMAT_REQUIRED',
        availableFormats: listCsvFormats(),
      },
      { status: 400 }
    )
  }

  try {
    const parsed = parseCsv(csvText, { bankId: account.bankId, formatId })
    const format = getCsvFormatById(parsed.formatId)
    const validRows = parsed.rows.filter((row) => row.errors.length === 0)

    const [merchants, templates] = await Promise.all([
      prisma.merchant.findMany({
        where: { accountId: account.id },
        include: merchantCategoriesInclude,
      }),
      prisma.transaction.findMany({
        where: { accountId: account.id, isRecurring: true, parentTransactionId: null },
        select: { id: true, amount: true, merchantId: true, merchant: true },
      }),
    ])

    const result = detectRecurringPayments(validRows, {
      merchants: merchants.map((m) => ({
        id: m.id,
        name: m.name,
        categoryIds: m.categories.map((c) => c.categoryId),
      })),
      templates,
      periodEnd: getExportPeriodEnd(validRows, csvText, format?.parseMetadata),
      salaryDay: account.salaryDay,
    })

    return NextResponse.json({
      formatId: parsed.formatId,
      formatLabel: parsed.formatLabel,
      ...(parsed.headerMismatch ? { headerMismatch: true } : {}),
      availableFormats: listCsvFormats(),
      period: toImportDateRangeIso(getImportDateRange(validRows)),
      rowCount: validRows.length,
      ...result,
    })
  } catch (error) {
    if (error instanceof CsvParseError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    logger.error('Recurring detection failed', error, { endpoint: '/api/transactions/recurring/detect' })
    return NextResponse.json({ error: 'Die Datei konnte nicht ausgewertet werden.' }, { status: 400 })
  }
}
