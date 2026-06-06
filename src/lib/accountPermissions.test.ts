import { describe, it, expect } from 'vitest'
import {
  assertCanWriteAccount,
  isAccountWritable,
  parseInvitableMemberRole,
  roleLabel,
  inviteRoleLabel,
  READ_ONLY_ACCOUNT_MESSAGE,
} from './accountPermissions'

describe('isAccountWritable', () => {
  it('erlaubt OWNER und MEMBER', () => {
    expect(isAccountWritable('OWNER')).toBe(true)
    expect(isAccountWritable('MEMBER')).toBe(true)
  })

  it('lehnt READ_ONLY ab', () => {
    expect(isAccountWritable('READ_ONLY')).toBe(false)
  })
})

describe('assertCanWriteAccount', () => {
  it('gibt null für schreibbare Rollen zurück', () => {
    expect(assertCanWriteAccount({ role: 'OWNER' })).toBeNull()
    expect(assertCanWriteAccount({ role: 'MEMBER' })).toBeNull()
  })

  it('gibt 403 für READ_ONLY zurück', async () => {
    const response = assertCanWriteAccount({ role: 'READ_ONLY' })
    expect(response).not.toBeNull()
    expect(response?.status).toBe(403)
    const body = await response?.json()
    expect(body.error).toBe(READ_ONLY_ACCOUNT_MESSAGE)
  })
})

describe('parseInvitableMemberRole', () => {
  it('standardisiert Einladungsrollen', () => {
    expect(parseInvitableMemberRole('READ_ONLY')).toBe('READ_ONLY')
    expect(parseInvitableMemberRole('MEMBER')).toBe('MEMBER')
    expect(parseInvitableMemberRole(undefined)).toBe('MEMBER')
  })
})

describe('roleLabel', () => {
  it('liefert deutsche Bezeichnungen', () => {
    expect(roleLabel('OWNER')).toBe('Inhaber')
    expect(roleLabel('MEMBER')).toBe('Mitglied')
    expect(roleLabel('READ_ONLY')).toBe('Nur Lesen')
  })
})

describe('inviteRoleLabel', () => {
  it('unterscheidet Einladungs-Zugriff', () => {
    expect(inviteRoleLabel('MEMBER')).toBe('Voller Zugriff')
    expect(inviteRoleLabel('READ_ONLY')).toBe('Nur Lesen')
  })
})
