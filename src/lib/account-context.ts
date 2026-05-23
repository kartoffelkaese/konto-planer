import { NextResponse } from 'next/server'
import type { Account, AccountMember, User } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getFirstAccountIdForUser, userHasAccountAccess } from '@/lib/accounts'
import { isErrorResponse } from '@/lib/api-auth'

export type AccountContext = {
  user: User
  account: Account
  membership: AccountMember
  email: string
}

export async function getUserBySession(): Promise<
  { user: User; email: string } | NextResponse
> {
  const session = await auth()

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  if (!user) {
    return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 })
  }

  return { user, email: session.user.email }
}

export async function getAccountContext(): Promise<AccountContext | NextResponse> {
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const { user, email } = authResult
  const session = await auth()
  let activeAccountId: string | undefined = session?.activeAccountId

  if (!activeAccountId) {
    activeAccountId =
      (await getFirstAccountIdForUser(user.id)) ?? undefined
  }

  if (!activeAccountId) {
    return NextResponse.json(
      { error: 'Kein Konto gefunden. Bitte erneut anmelden.' },
      { status: 404 }
    )
  }

  const hasAccess = await userHasAccountAccess(user.id, activeAccountId)
  if (!hasAccess) {
    activeAccountId =
      (await getFirstAccountIdForUser(user.id)) ?? undefined
    if (!activeAccountId) {
      return NextResponse.json({ error: 'Kein Zugriff auf Konto' }, { status: 403 })
    }
  }

  const membership = await prisma.accountMember.findUnique({
    where: {
      accountId_userId: {
        accountId: activeAccountId,
        userId: user.id,
      },
    },
  })

  if (!membership) {
    return NextResponse.json({ error: 'Kein Zugriff auf Konto' }, { status: 403 })
  }

  const account = await prisma.account.findUnique({
    where: { id: activeAccountId },
  })

  if (!account) {
    return NextResponse.json({ error: 'Konto nicht gefunden' }, { status: 404 })
  }

  return { user, account, membership, email }
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

  const account = await prisma.account.findUnique({
    where: { id: accountId },
  })

  if (!account) {
    return NextResponse.json({ error: 'Konto nicht gefunden' }, { status: 404 })
  }

  return { user, account, membership, email }
}
