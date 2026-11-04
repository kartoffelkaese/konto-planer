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
    const email = normalizeEmail(user.email)
    const { startDate, endDate } = getSalaryMonthRange(account.salaryDay)
    const salaryMonth = { startDate, endDate }
    const planning = !account.isSimpleAccount

    // Alle Abfragen gleichzeitig – jede einzelne ist eine Rundreise zur Datenbank
    const [pendingInvitations, pendingSplitInvitations, unconfirmedTransactions, templates, instanceCounts] =
      await Promise.all([
        prisma.accountInvite.count({
          where: { email, status: AccountInviteStatus.PENDING },
        }),
        prisma.splitListInvite.count({
          where: { email, status: SplitInviteStatus.PENDING },
        }),
        prisma.transaction.count({
          where: {
            accountId: account.id,
            isConfirmed: false,
            date: { gte: startDate, lte: endDate },
          },
        }),
        planning
          ? prisma.transaction.findMany({
              where: {
                accountId: account.id,
                isRecurring: true,
                isRecurringPaused: false,
                parentTransactionId: null,
              },
              select: { id: true, date: true, recurringInterval: true, autoPendingUntil: true },
            })
          : Promise.resolve([]),
        planning ? loadInstanceCounts(account.id, undefined, salaryMonth) : Promise.resolve(new Map<string, number>()),
      ])

    // Handlungsbedarf: Termine im Gehaltsmonat ohne Buchung, die nicht schon eingetragen bzw.
    // bewusst übergangen wurden. „Am Buchungstag“ trägt künftige Termine selbst ein – die zählen nicht.
    const attentionUntil = account.recurringAutoMode === 'ON_DUE_DATE' ? new Date() : endDate
    const recurringAttention = templates.filter(
      (t) => openDueDates(t, salaryMonth, attentionUntil, instanceCounts.get(t.id) ?? 0).length > 0
    ).length

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
