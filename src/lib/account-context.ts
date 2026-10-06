import { NextResponse } from 'next/server'
import type { Account, AccountMember, User } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getFirstAccountIdForUser } from '@/lib/accounts'
import { isErrorResponse } from '@/lib/api-auth'
import { assertCanWriteAccount } from '@/lib/accountPermissions'
import {
  getEffectivePlan,
  getEntitlements,
  highestPlan,
  writableOwnedAccountIds,
  type PlanId,
} from '@/lib/plans'
import { PLAN_MESSAGES, planRequiredResponse } from '@/lib/planGuards'

export type AccountContext = {
  user: User
  account: Account
  membership: AccountMember
  email: string
  /** Eigenes Level des Nutzers – für das, was er selbst anlegen darf (Konten, Split-Listen) */
  plan: PlanId
  /** Level des Konto-Inhabers – für das, was im aktiven Konto möglich ist (Statistiken, CSV-Import, Teilen) */
  accountPlan: PlanId
  /**
   * Schreibschutz durch das Level: `limit` = Inhaber hat mehr Konten als erlaubt und dieses
   * ist nicht das gewählte; `shared` = Mitglied eines Kontos, dessen Inhaber nicht teilen darf.
   */
  planLock: PlanLock
}

export type PlanLock = 'limit' | 'shared' | null

/** Inhaber eines Kontos samt Level – wird mit dem Konto zusammen geladen */
const ACCOUNT_WITH_OWNER_PLANS = {
  include: {
    members: {
      where: { role: 'OWNER' },
      select: {
        user: {
          select: {
            plan: true,
            planExpiresAt: true,
            keptAccountId: true,
            memberships: {
              where: { role: 'OWNER' },
              select: { accountId: true },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    },
  },
} as const

type OwnerPlanRow = {
  user: {
    plan: PlanId
    planExpiresAt: Date | null
    keptAccountId: string | null
    memberships: { accountId: string }[]
  }
}

function accountPlanOf(owners: OwnerPlanRow[]): PlanId {
  return highestPlan(owners.map((owner) => getEffectivePlan(owner.user)))
}

function planLockOf(
  accountId: string,
  role: AccountMember['role'],
  owners: OwnerPlanRow[]
): PlanLock {
  if (owners.length === 0) return null

  const withinLimit = owners.some(({ user }) => {
    const { maxOwnedAccounts } = getEntitlements(getEffectivePlan(user))
    const writable = writableOwnedAccountIds(
      user.memberships.map((m) => m.accountId),
      user.keptAccountId,
      maxOwnedAccounts
    )
    return writable === null || writable.includes(accountId)
  })
  if (!withinLimit) return 'limit'

  if (role !== 'OWNER' && !getEntitlements(accountPlanOf(owners)).shareAccounts) return 'shared'
  return null
}

type SessionUser = { user: User; email: string; activeAccountId?: string }

/**
 * Nutzer zur Sitzung – über die ID aus dem Token, nicht über die E-Mail.
 * Die E-Mail muss trotzdem noch übereinstimmen: Nach einem E-Mail-Wechsel gilt die alte
 * Sitzung wie bisher nicht mehr, und sie kann nie an ein Konto geraten, das die frei
 * gewordene Adresse später neu registriert.
 */
async function resolveSessionUser(): Promise<SessionUser | NextResponse> {
  const session = await auth()

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  const email = session.user.email
  const user = session.user.id
    ? await prisma.user.findUnique({ where: { id: session.user.id } })
    : null

  if (!user || user.email !== email) {
    return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 })
  }

  // Passwort wurde inzwischen geändert: ältere Sitzungen gelten nicht mehr
  if ((session.sessionVersion ?? 0) !== user.sessionVersion) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  return { user, email, activeAccountId: session.activeAccountId }
}

export async function getUserBySession(): Promise<
  { user: User; email: string } | NextResponse
> {
  const result = await resolveSessionUser()
  if (isErrorResponse(result)) return result
  return { user: result.user, email: result.email }
}

function findMembershipWithAccount(accountId: string, userId: string) {
  return prisma.accountMember.findUnique({
    where: { accountId_userId: { accountId, userId } },
    include: { account: ACCOUNT_WITH_OWNER_PLANS },
  })
}

export async function getAccountContext(): Promise<AccountContext | NextResponse> {
  const sessionUser = await resolveSessionUser()
  if (isErrorResponse(sessionUser)) return sessionUser

  const { user, email } = sessionUser
  const activeAccountId =
    sessionUser.activeAccountId ?? (await getFirstAccountIdForUser(user.id)) ?? undefined

  if (!activeAccountId) {
    return NextResponse.json(
      { error: 'Kein Konto gefunden. Bitte erneut anmelden.' },
      { status: 404 }
    )
  }

  let membership = await findMembershipWithAccount(activeAccountId, user.id)

  // Kein Zugriff (mehr) auf das gewählte Konto: auf das erste eigene Konto ausweichen
  if (!membership) {
    const fallbackAccountId = await getFirstAccountIdForUser(user.id)
    if (!fallbackAccountId) {
      return NextResponse.json({ error: 'Kein Zugriff auf Konto' }, { status: 403 })
    }
    membership = await findMembershipWithAccount(fallbackAccountId, user.id)
    if (!membership) {
      return NextResponse.json({ error: 'Kein Zugriff auf Konto' }, { status: 403 })
    }
  }

  const { account: accountWithOwners, ...memberFields } = membership
  const { members: owners, ...account } = accountWithOwners
  return {
    user,
    account,
    membership: memberFields,
    email,
    plan: getEffectivePlan(user),
    accountPlan: accountPlanOf(owners),
    planLock: planLockOf(account.id, memberFields.role, owners),
  }
}

export async function getAccountContextForAccountId(
  accountId: string
): Promise<AccountContext | NextResponse> {
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const { user, email } = authResult
  const membership = await prisma.accountMember.findUnique({
    where: {
      accountId_userId: { accountId, userId: user.id },
    },
  })

  if (!membership) {
    return NextResponse.json({ error: 'Kein Zugriff auf Konto' }, { status: 403 })
  }

  const accountWithOwners = await prisma.account.findUnique({
    where: { id: accountId },
    ...ACCOUNT_WITH_OWNER_PLANS,
  })

  if (!accountWithOwners) {
    return NextResponse.json({ error: 'Konto nicht gefunden' }, { status: 404 })
  }

  const { members: owners, ...account } = accountWithOwners
  return {
    user,
    account,
    membership,
    email,
    plan: getEffectivePlan(user),
    accountPlan: accountPlanOf(owners),
    planLock: planLockOf(account.id, membership.role, owners),
  }
}

export function requireWritableContext(
  ctx: AccountContext
): NextResponse | null {
  const roleError = assertCanWriteAccount(ctx.membership)
  if (roleError) return roleError
  if (ctx.planLock === 'limit') return planRequiredResponse(PLAN_MESSAGES.accountLockedLimit)
  if (ctx.planLock === 'shared') return planRequiredResponse(PLAN_MESSAGES.accountLockedShared)
  return null
}
