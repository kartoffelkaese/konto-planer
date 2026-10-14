import { AccountMemberRole, type User } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  downgradedAt,
  getEffectivePlan,
  keptAccountChoiceRequired,
  type PlanId,
} from '@/lib/plans'

/** Eigene Konten, ältestes zuerst */
export async function ownedAccountIds(userId: string): Promise<string[]> {
  const owned = await prisma.accountMember.findMany({
    where: { userId, role: AccountMemberRole.OWNER },
    select: { accountId: true },
    orderBy: { createdAt: 'asc' },
  })
  return owned.map((m) => m.accountId)
}

/**
 * Steht nach einer Herabstufung die Wahl des beschreibbaren Kontos aus? Diese Wahl ist frei –
 * die Frist zwischen zwei Wechseln gilt erst danach wieder.
 */
export async function isKeptAccountChoiceRequired(
  user: Pick<User, 'id' | 'plan' | 'planExpiresAt' | 'keptAccountChangedAt'>,
  ownedIds?: string[]
): Promise<boolean> {
  const plan: PlanId = getEffectivePlan(user)
  if (plan === 'FULL') return false

  const owned = ownedIds ?? (await ownedAccountIds(user.id))
  if (owned.length <= 1) return false

  const lastDowngrade = await prisma.planChange.findFirst({
    where: { userId: user.id, toPlan: 'BASIC' },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  })

  return keptAccountChoiceRequired({
    plan,
    ownedAccounts: owned.length,
    keptAccountChangedAt: user.keptAccountChangedAt,
    downgradedAt: downgradedAt(user, lastDowngrade?.createdAt),
  })
}
