import { NextResponse } from 'next/server'
import type { AccountMember, AccountMemberRole } from '@prisma/client'

export const READ_ONLY_ACCOUNT_MESSAGE =
  'Für dieses Konto haben Sie nur Lesezugriff'

export function isAccountWritable(role: AccountMemberRole): boolean {
  return role === 'OWNER' || role === 'MEMBER'
}

export function isInvitableMemberRole(
  role: unknown
): role is Extract<AccountMemberRole, 'MEMBER' | 'READ_ONLY'> {
  return role === 'MEMBER' || role === 'READ_ONLY'
}

export function parseInvitableMemberRole(role: unknown): 'MEMBER' | 'READ_ONLY' {
  if (role === 'READ_ONLY') return 'READ_ONLY'
  return 'MEMBER'
}

export function assertCanWriteAccount(
  membership: Pick<AccountMember, 'role'>
): NextResponse | null {
  if (!isAccountWritable(membership.role)) {
    return NextResponse.json({ error: READ_ONLY_ACCOUNT_MESSAGE }, { status: 403 })
  }
  return null
}

export function roleLabel(role: AccountMemberRole | string): string {
  switch (role) {
    case 'OWNER':
      return 'Inhaber'
    case 'READ_ONLY':
      return 'Nur Lesen'
    case 'MEMBER':
    default:
      return 'Mitglied'
  }
}

export function inviteRoleLabel(role: AccountMemberRole | string): string {
  return role === 'READ_ONLY' ? 'Nur Lesen' : 'Voller Zugriff'
}
