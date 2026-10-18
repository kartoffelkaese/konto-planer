import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAccountContext, requireWritableContext } from '@/lib/account-context'
import {
  isErrorResponse,
  readJsonBody,
  validateAmount,
  validateDateInput,
  validateRecurringInterval,
  validateSalaryDay,
} from '@/lib/api-auth'
import { assertRecurringNotAllowed } from '@/lib/simpleAccount'
import { resolveMerchantForTransaction } from '@/lib/resolveMerchantForTransaction'
import { applyTransactionCategoryOnSave, validateTransactionCategoryId } from '@/lib/transactionCategory'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

/** Höchstzahl wiederkehrender Zahlungen je Aufruf */
const RECURRING_BULK_MAX_ITEMS = 100

type BulkItem = {
  merchantId?: unknown
  merchant?: unknown
  createNewMerchant?: unknown
  amount?: unknown
  date?: unknown
  recurringInterval?: unknown
  categoryId?: unknown
}

/**
 * Legt mehrere wiederkehrende Zahlungen auf einmal an (Vorschläge aus dem Kontoauszug) und
 * setzt auf Wunsch den Gehaltstag. Erst wird alles geprüft, dann alles in einem Zug angelegt.
 */
export async function POST(request: Request) {
  const ctx = await getAccountContext()
  if (isErrorResponse(ctx)) return ctx

  const writeError = requireWritableContext(ctx)
  if (writeError) return writeError

  const { account, user } = ctx
  const planningError = assertRecurringNotAllowed(account)
  if (planningError) return planningError

  if (!checkRateLimit(`recurring-bulk:${user.id}`, RATE_LIMITS.recurringBulk).allowed) {
    return NextResponse.json(
      { error: 'Zu viele Versuche. Bitte versuche es später erneut.' },
      { status: 429 }
    )
  }

  const body = await readJsonBody<{ items?: unknown; salaryDay?: unknown }>(request)
  if (isErrorResponse(body)) return body

  const items = Array.isArray(body.items) ? (body.items as BulkItem[]) : null
  if (!items || (items.length === 0 && body.salaryDay === undefined)) {
    return NextResponse.json({ error: 'Bitte wähle mindestens eine Zahlung aus.' }, { status: 400 })
  }
  if (items.length > RECURRING_BULK_MAX_ITEMS) {
    return NextResponse.json(
      { error: `Höchstens ${RECURRING_BULK_MAX_ITEMS} Zahlungen auf einmal.` },
      { status: 400 }
    )
  }

  let salaryDay: number | undefined
  if (body.salaryDay !== undefined) {
    const validated = validateSalaryDay(body.salaryDay)
    if (isErrorResponse(validated)) return validated
    salaryDay = validated
  }

  // Erst alles prüfen – ein ungültiger Eintrag legt nichts an
  const prepared = []
  for (const item of items) {
    if (!item || typeof item !== 'object') {
      return NextResponse.json({ error: 'Ungültiger Eintrag' }, { status: 400 })
    }
    const amount = validateAmount(item.amount)
    if (isErrorResponse(amount)) return amount
    const date = validateDateInput(item.date)
    if (isErrorResponse(date)) return date
    if (amount === undefined || amount === 0 || date === undefined) {
      return NextResponse.json({ error: 'Betrag und Datum sind erforderlich' }, { status: 400 })
    }
    const interval = validateRecurringInterval(item.recurringInterval)
    if (isErrorResponse(interval)) return interval
    const category = await validateTransactionCategoryId(item.categoryId, account.id)
    if (category.error) return category.error
    const merchantName = typeof item.merchant === 'string' ? item.merchant.trim() : ''
    if (!item.merchantId && !merchantName) {
      return NextResponse.json({ error: 'Händler ist erforderlich' }, { status: 400 })
    }
    if (merchantName.length > 100) {
      return NextResponse.json({ error: 'Der Händlername ist zu lang.' }, { status: 400 })
    }
    prepared.push({
      merchantId: typeof item.merchantId === 'string' ? item.merchantId : null,
      merchant: merchantName,
      createNewMerchant: item.createNewMerchant === true,
      amount,
      date,
      interval,
      categoryId: category.categoryId ?? null,
    })
  }

  try {
    // Händler zuerst auflösen bzw. anlegen (wie beim einzelnen Anlegen)
    const resolved: Array<(typeof prepared)[number] & { merchantId: string }> = []
    for (const item of prepared) {
      const merchant = await resolveMerchantForTransaction(account.id, item)
      if (merchant.error) return merchant.error
      resolved.push({ ...item, merchantId: merchant.merchantId, merchant: merchant.merchant })
    }

    await prisma.$transaction(async (tx) => {
      for (const item of resolved) {
        await tx.transaction.create({
          data: {
            accountId: account.id,
            merchant: item.merchant,
            merchantId: item.merchantId,
            amount: item.amount,
            date: item.date,
            categoryId: item.categoryId,
            isRecurring: true,
            recurringInterval: item.interval,
          },
        })
        await applyTransactionCategoryOnSave(tx, {
          merchantId: item.merchantId,
          categoryId: item.categoryId,
        })
      }
      if (salaryDay !== undefined) {
        await tx.account.update({ where: { id: account.id }, data: { salaryDay } })
      }
    })

    return NextResponse.json({ created: resolved.length, salaryDay: salaryDay ?? null })
  } catch (error) {
    logger.error('Recurring bulk create failed', error, { endpoint: '/api/transactions/recurring/bulk' })
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}
