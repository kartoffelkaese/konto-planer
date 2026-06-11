import { prisma } from '@/lib/prisma'
import { hasValidVerificationToken } from '@/lib/emailVerification'

export type CleanupResult = {
  deletedUsers: number
  deletedAccounts: number
}

export async function cleanupUnverifiedUsers(): Promise<CleanupResult> {
  const now = new Date()
  let deletedUsers = 0
  let deletedAccounts = 0

  const candidates = await prisma.user.findMany({
    where: { emailVerified: null },
    select: { id: true },
  })

  for (const { id: userId } of candidates) {
    const hasValid = await hasValidVerificationToken(userId)
    if (hasValid) continue

    const memberships = await prisma.accountMember.findMany({
      where: { userId },
      select: { accountId: true },
    })

    await prisma.$transaction(async (tx) => {
      for (const { accountId } of memberships) {
        const memberCount = await tx.accountMember.count({
          where: { accountId },
        })
        if (memberCount === 1) {
          await tx.account.delete({ where: { id: accountId } })
          deletedAccounts += 1
        }
      }
      await tx.user.delete({ where: { id: userId } })
      deletedUsers += 1
    })
  }

  // Abgelaufene Tokens aufräumen (verifizierte Nutzer)
  await prisma.emailVerificationToken.deleteMany({
    where: { expiresAt: { lte: now } },
  })

  return { deletedUsers, deletedAccounts }
}
