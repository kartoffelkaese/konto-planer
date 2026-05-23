import { NextResponse } from 'next/server'
import { AccountInviteStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getUserBySession, isErrorResponse } from '@/lib/api-auth'
import { normalizeEmail } from '@/lib/accounts'

export async function GET() {
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult
  const email = normalizeEmail(user.email)

  const invites = await prisma.accountInvite.findMany({
    where: {
      email,
      status: AccountInviteStatus.PENDING,
    },
    include: {
      account: { select: { id: true, name: true } },
      invitedBy: { select: { email: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(
    invites.map((i) => ({
      id: i.id,
      accountId: i.account.id,
      accountName: i.account.name,
      invitedByEmail: i.invitedBy.email,
      createdAt: i.createdAt,
    }))
  )
}
