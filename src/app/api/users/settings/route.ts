import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAccountContext, requireWritableContext } from '@/lib/account-context'
import {
  isErrorResponse,
  validateSalaryDay,
  validateAccountDisplayName,
  validateTransferSenderName,
  validateSplitDisplayName,
  validateBankId,
  readJsonBody,
} from '@/lib/api-auth'
import {
  assertCanEnableSimpleAccount,
  assertOwnerForSimpleAccountToggle,
} from '@/lib/simpleAccount'
import { logger } from '@/lib/logger'
import { keptAccountChangeAllowedAt, plansEnabled } from '@/lib/plans'
import { hasRunningSubscription, paidPeriodEnd } from '@/lib/billingRoute'
import { billingEnabled } from '@/lib/stripe'
import { isKeptAccountChoiceRequired } from '@/lib/keptAccount'
import type { AccountContext } from '@/lib/account-context'

/** Level-Angaben für die Oberfläche (eigenes Level, Level des Konto-Inhabers, Testphase) */
async function planFields({ user, plan, accountPlan, planLock }: AccountContext) {
  return {
    plan,
    accountPlan,
    planLock,
    keptAccountId: user.keptAccountId,
    keptAccountChangeAllowedAt: keptAccountChangeAllowedAt(user.keptAccountChangedAt),
    keptAccountChoiceRequired: plansEnabled() && (await isKeptAccountChoiceRequired(user)),
    planSource: user.planSource,
    planExpiresAt: user.planExpiresAt,
    plansEnabled: plansEnabled(),
    isAdmin: user.isAdmin,
    billing: billingFields(user),
  }
}

/** Abo-Angaben für die Oberfläche – ohne Stripe-Kennungen */
function billingFields(user: AccountContext['user']) {
  const running = hasRunningSubscription(user.stripeSubscriptionStatus)
  const periodEnd = paidPeriodEnd(user)
  return {
    enabled: billingEnabled(),
    hasCustomer: user.stripeCustomerId !== null,
    running,
    status: user.stripeSubscriptionStatus,
    interval: user.planInterval,
    cancelAtPeriodEnd: user.planCancelAtPeriodEnd,
    periodEnd,
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const ctx = await getAccountContext()
    if (isErrorResponse(ctx)) return ctx

    const { user, account, membership } = ctx
    const body = await readJsonBody<Record<string, unknown>>(request)
    if (isErrorResponse(body)) return body

    let splitDisplayNameUpdated: string | null | undefined

    // Einführung „Aus Kontoauszug erkennen“ gesehen – gilt für den Nutzer, nicht das Konto
    if (body.recurringIntroSeen === true && user.recurringIntroSeenAt === null) {
      await prisma.user.update({
        where: { id: user.id },
        data: { recurringIntroSeenAt: new Date() },
      })
    }

    if (body.splitDisplayName !== undefined) {
      const splitDisplayName = validateSplitDisplayName(body.splitDisplayName)
      if (isErrorResponse(splitDisplayName)) return splitDisplayName
      await prisma.user.update({
        where: { id: user.id },
        data: { splitDisplayName },
      })
      splitDisplayNameUpdated = splitDisplayName
    }

    const data: {
      salaryDay?: number
      name?: string
      transferSenderName?: string | null
      bankId?: string | null
      isSimpleAccount?: boolean
    } = {}

    if (body.isSimpleAccount !== undefined) {
      const ownerError = assertOwnerForSimpleAccountToggle(membership.role)
      if (ownerError) return ownerError

      if (typeof body.isSimpleAccount !== 'boolean') {
        return NextResponse.json(
          { error: 'Ungültiger Wert für Einfaches Konto' },
          { status: 400 }
        )
      }

      if (body.isSimpleAccount && !account.isSimpleAccount) {
        const enableError = await assertCanEnableSimpleAccount(account.id)
        if (enableError) return enableError
      }

      data.isSimpleAccount = body.isSimpleAccount
    }

    if (body.salaryDay !== undefined) {
      const salaryDay = validateSalaryDay(body.salaryDay)
      if (isErrorResponse(salaryDay)) return salaryDay
      data.salaryDay = salaryDay
    }

    if (body.accountName !== undefined || body.name !== undefined) {
      const name = validateAccountDisplayName(body.accountName ?? body.name)
      if (isErrorResponse(name)) return name
      if (name) data.name = name
    }

    if (body.transferSenderName !== undefined) {
      const senderName = validateTransferSenderName(body.transferSenderName)
      if (isErrorResponse(senderName)) return senderName
      data.transferSenderName = senderName
    }

    if (body.bankId !== undefined) {
      const bankId = validateBankId(body.bankId)
      if (isErrorResponse(bankId)) return bankId
      data.bankId = bankId ?? null
    }

    if (Object.keys(data).length === 0 && splitDisplayNameUpdated === undefined) {
      return NextResponse.json({ error: 'Keine Änderungen angegeben' }, { status: 400 })
    }

    if (Object.keys(data).length > 0) {
      const writeError = requireWritableContext(ctx)
      if (writeError) return writeError
    }

    const updated =
      Object.keys(data).length > 0
        ? await prisma.account.update({
            where: { id: account.id },
            data,
          })
        : account

    const freshUser =
      splitDisplayNameUpdated !== undefined
        ? await prisma.user.findUniqueOrThrow({
            where: { id: user.id },
            select: { splitDisplayName: true },
          })
        : { splitDisplayName: user.splitDisplayName }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      pendingEmail: user.pendingEmail,
      salaryDay: updated.salaryDay,
      accountName: updated.name,
      transferSenderName: updated.transferSenderName,
      splitDisplayName: freshUser.splitDisplayName,
      bankId: updated.bankId,
      isSimpleAccount: updated.isSimpleAccount,
      createdAt: updated.createdAt,
      activeAccountId: account.id,
      role: membership.role,
      ...(await planFields(ctx)),
    })
  } catch (error) {
    logger.error('Error updating user settings', error, { endpoint: '/api/users/settings' })
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const ctx = await getAccountContext()
    if (isErrorResponse(ctx)) return ctx

    const { user, account, membership } = ctx

    return NextResponse.json({
      id: user.id,
      email: user.email,
      pendingEmail: user.pendingEmail,
      salaryDay: account.salaryDay,
      accountName: account.name,
      transferSenderName: account.transferSenderName,
      splitDisplayName: user.splitDisplayName,
      recurringIntroSeen: user.recurringIntroSeenAt !== null,
      bankId: account.bankId,
      isSimpleAccount: account.isSimpleAccount,
      createdAt: account.createdAt,
      activeAccountId: account.id,
      role: membership.role,
      ...(await planFields(ctx)),
    })
  } catch (error) {
    logger.error('Error fetching user settings', error, { endpoint: '/api/users/settings' })
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
