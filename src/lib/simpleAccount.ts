import { NextResponse } from 'next/server'
import { AccountMemberRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export const SIMPLE_ACCOUNT_RECURRING_BLOCK_MESSAGE =
  'Bitte löschen Sie zuerst alle wiederkehrenden Zahlungen unter „Wiederkehrend“.'

export const SIMPLE_ACCOUNT_PLANNING_FORBIDDEN_MESSAGE =
  'Diese Funktion steht für einfache Konten nicht zur Verfügung.'

export async function countRecurringTemplates(accountId: string): Promise<number> {
  return prisma.transaction.count({
    where: {
      accountId,
      isRecurring: true,
    },
  })
}

export async function assertCanEnableSimpleAccount(
  accountId: string
): Promise<NextResponse | null> {
  const count = await countRecurringTemplates(accountId)
  if (count > 0) {
    return NextResponse.json(
      { error: SIMPLE_ACCOUNT_RECURRING_BLOCK_MESSAGE },
      { status: 400 }
    )
  }
  return null
}

export function assertPlanningAccount(account: {
  isSimpleAccount: boolean
}): NextResponse | null {
  if (account.isSimpleAccount) {
    return NextResponse.json(
      { error: SIMPLE_ACCOUNT_PLANNING_FORBIDDEN_MESSAGE },
      { status: 403 }
    )
  }
  return null
}

export function assertRecurringNotAllowed(account: {
  isSimpleAccount: boolean
}): NextResponse | null {
  return assertPlanningAccount(account)
}

export function assertOwnerForSimpleAccountToggle(
  role: AccountMemberRole
): NextResponse | null {
  if (role !== AccountMemberRole.OWNER) {
    return NextResponse.json(
      { error: 'Nur der Kontoinhaber kann den Kontotyp ändern' },
      { status: 403 }
    )
  }
  return null
}
