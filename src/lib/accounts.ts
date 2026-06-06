import { AccountInviteStatus, AccountMemberRole, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function createDefaultAccountForUser(
  userId: string,
  salaryDay: number,
  name = 'Mein Konto',
  tx: Prisma.TransactionClient = prisma
) {
  const account = await tx.account.create({
    data: {
      name,
      salaryDay,
    },
  })
  await tx.accountMember.create({
    data: {
      accountId: account.id,
      userId,
      role: AccountMemberRole.OWNER,
    },
  })
  return account
}

export async function getFirstAccountIdForUser(userId: string): Promise<string | null> {
  const membership = await prisma.accountMember.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { accountId: true },
  })
  return membership?.accountId ?? null
}

export async function acceptPendingInvites(
  userId: string,
  email: string,
  tx: Prisma.TransactionClient = prisma
) {
  const normalized = normalizeEmail(email)
  const pending = await tx.accountInvite.findMany({
    where: {
      email: normalized,
      status: AccountInviteStatus.PENDING,
    },
  })

  for (const invite of pending) {
    await tx.accountMember.upsert({
      where: {
        accountId_userId: {
          accountId: invite.accountId,
          userId,
        },
      },
      create: {
        accountId: invite.accountId,
        userId,
        role: invite.role === AccountMemberRole.OWNER ? AccountMemberRole.MEMBER : invite.role,
      },
      update: {},
    })
    await tx.accountInvite.update({
      where: { id: invite.id },
      data: { status: AccountInviteStatus.ACCEPTED },
    })
  }
}

export async function userHasAccountAccess(
  userId: string,
  accountId: string
): Promise<boolean> {
  const member = await prisma.accountMember.findUnique({
    where: {
      accountId_userId: { accountId, userId },
    },
  })
  return member != null
}
