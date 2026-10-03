import { NextResponse } from 'next/server'
import type { Account, AccountMember, User } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getFirstAccountIdForUser } from '@/lib/accounts'
import { isErrorResponse } from '@/lib/api-auth'
import { assertCanWriteAccount } from '@/lib/accountPermissions'

export type AccountContext = {
  user: User
  account: Account
  membership: AccountMember
  email: string
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
    include: { account: true },
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

  const { account, ...memberFields } = membership
  return { user, account, membership: memberFields, email }
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

export function requireWritableContext(
  ctx: AccountContext
): NextResponse | null {
  return assertCanWriteAccount(ctx.membership)
}
