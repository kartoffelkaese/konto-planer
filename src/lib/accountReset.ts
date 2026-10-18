import { AccountMemberRole, type Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { ResetLevel, ResetResult, ResettableAccount } from '@/lib/accountResetShared'

export { RESET_ALL_CONFIRM_TEXT, RESET_LEVELS } from '@/lib/accountResetShared'
export type { ResetLevel, ResetResult, ResettableAccount } from '@/lib/accountResetShared'

/** Vorlage einer wiederkehrenden Zahlung (Instanzen haben eine `parentTransactionId`) */
const RECURRING_TEMPLATE = { isRecurring: true, parentTransactionId: null } satisfies Prisma.TransactionWhereInput

/** Eigene Konten (Rolle Inhaber) mit Zählwerten für den Dialog, ältestes zuerst */
export async function getResettableAccounts(userId: string): Promise<ResettableAccount[]> {
  const memberships = await prisma.accountMember.findMany({
    where: { userId, role: AccountMemberRole.OWNER },
    orderBy: { createdAt: 'asc' },
    select: {
      account: {
        select: {
          id: true,
          name: true,
          _count: { select: { categories: true, merchants: true } },
        },
      },
    },
  })
  const accountIds = memberships.map((m) => m.account.id)
  if (accountIds.length === 0) return []

  const [all, templates] = await Promise.all([
    prisma.transaction.groupBy({ by: ['accountId'], where: { accountId: { in: accountIds } }, _count: true }),
    prisma.transaction.groupBy({
      by: ['accountId'],
      where: { accountId: { in: accountIds }, ...RECURRING_TEMPLATE },
      _count: true,
    }),
  ])
  const countOf = (rows: { accountId: string; _count: number }[], id: string) =>
    rows.find((row) => row.accountId === id)?._count ?? 0

  return memberships.map(({ account }) => {
    const recurring = countOf(templates, account.id)
    return {
      id: account.id,
      name: account.name,
      transactions: countOf(all, account.id) - recurring,
      recurring,
      categories: account._count.categories,
      merchants: account._count.merchants,
    }
  })
}

/**
 * Setzt die Konten zurück (in einer Datenbank-Transaktion). Rechte prüft der Aufrufer.
 *
 * Umbuchungen in Konten, die nicht zurückgesetzt werden, bleiben stehen: Wird hier die
 * Zielbuchung gelöscht, verliert die Quellbuchung nur ihre Verknüpfung; wird die Quelle
 * gelöscht, entfällt das Paar per Cascade und die Gegenbuchung bleibt.
 */
export async function resetAccounts(accountIds: string[], level: ResetLevel): Promise<ResetResult> {
  if (accountIds.length === 0) return { transactions: 0, recurring: 0, categories: 0, merchants: 0 }

  const inAccounts = { accountId: { in: accountIds } } satisfies Prisma.TransactionWhereInput
  const deleteWhere: Prisma.TransactionWhereInput =
    level === 'transactions' ? { ...inAccounts, NOT: RECURRING_TEMPLATE } : inAccounts

  return prisma.$transaction(async (tx) => {
    // Umbuchungen aus anderen Konten, deren Zielbuchung hier verschwindet: Verknüpfung lösen
    const orphanedPairs = await tx.transferPair.findMany({
      where: {
        targetTransaction: deleteWhere,
        sourceTransaction: { accountId: { notIn: accountIds } },
      },
      select: { id: true, sourceTransactionId: true },
    })
    if (orphanedPairs.length > 0) {
      await tx.transferPair.deleteMany({ where: { id: { in: orphanedPairs.map((p) => p.id) } } })
      await tx.transaction.updateMany({
        where: { id: { in: orphanedPairs.map((p) => p.sourceTransactionId) } },
        data: { isTransfer: false, transferTargetAccountId: null, transferTargetMerchant: null },
      })
    }

    const recurring =
      level === 'transactions' ? 0 : await tx.transaction.count({ where: { ...inAccounts, ...RECURRING_TEMPLATE } })
    const { count: deleted } = await tx.transaction.deleteMany({ where: deleteWhere })

    let categories = 0
    let merchants = 0
    if (level === 'everything') {
      ;({ count: merchants } = await tx.merchant.deleteMany({ where: { accountId: { in: accountIds } } }))
      ;({ count: categories } = await tx.category.deleteMany({ where: { accountId: { in: accountIds } } }))
    }

    return { transactions: deleted - recurring, recurring, categories, merchants }
  })
}
