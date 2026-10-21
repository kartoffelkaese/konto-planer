import { NextResponse } from 'next/server'
import { AccountInviteStatus, SplitInviteStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getAccountContext } from '@/lib/account-context'
import { getUserBySession, isErrorResponse } from '@/lib/api-auth'
import { normalizeEmail } from '@/lib/accounts'
import { getSalaryMonthRange } from '@/lib/dateUtils'
import { loadInstanceCounts, openDueDates } from '@/lib/recurringAutoPending'
import { logger } from '@/lib/logger'

export async function GET() {
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const ctx = await getAccountContext()
  if (isErrorResponse(ctx)) return ctx

  const { user } = authResult
  const { account } = ctx

  try {
    const pendingInvitations = await prisma.accountInvite.count({
      where: {
        email: normalizeEmail(user.email),
        status: AccountInviteStatus.PENDING,
      },
    })

    const pendingSplitInvitations = await prisma.splitListInvite.count({
      where: {
        email: normalizeEmail(user.email),
        status: SplitInviteStatus.PENDING,
      },
    })
    const { startDate, endDate } = getSalaryMonthRange(account.salaryDay)

    const unconfirmedTransactions = await prisma.transaction.count({
      where: {
        accountId: account.id,
        isConfirmed: false,
        date: { gte: startDate, lte: endDate },
      },
    })

    let recurringAttention = 0

    if (!account.isSimpleAccount) {
    // Handlungsbedarf: Termine im Gehaltsmonat ohne Buchung, die nicht schon eingetragen bzw.
    // bewusst übergangen wurden. „Am Buchungstag“ trägt künftige Termine selbst ein – die zählen nicht.
    const templates = await prisma.transaction.findMany({
      where: {
        accountId: account.id,
        isRecurring: true,
        isRecurringPaused: false,
        parentTransactionId: null,
      },
      select: { id: true, date: true, recurringInterval: true, autoPendingUntil: true },
    })
    const attentionUntil = account.recurringAutoMode === 'ON_DUE_DATE' ? new Date() : endDate
    const salaryMonth = { startDate, endDate }
    const instanceCounts = await loadInstanceCounts(account.id, templates.map((t) => t.id), salaryMonth)
    recurringAttention = templates.filter(
      (t) => openDueDates(t, salaryMonth, attentionUntil, instanceCounts.get(t.id) ?? 0).length > 0
    ).length
    }

    return NextResponse.json({
      unconfirmedTransactions,
      recurringAttention,
      pendingInvitations,
      pendingSplitInvitations,
    })
  } catch (error) {
    logger.error('Error fetching nav badges', error, { endpoint: '/api/nav-badges' })
    return NextResponse.json(
      { error: 'Fehler beim Laden der Navigationshinweise' },
      { status: 500 }
    )
  }
}
