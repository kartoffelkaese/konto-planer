import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'
import { AccountMemberRole } from '@prisma/client'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    transaction: {
      count: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'
import {
  SIMPLE_ACCOUNT_RECURRING_BLOCK_MESSAGE,
  SIMPLE_ACCOUNT_PLANNING_FORBIDDEN_MESSAGE,
  assertCanEnableSimpleAccount,
  assertPlanningAccount,
  assertOwnerForSimpleAccountToggle,
  assertRecurringNotAllowed,
  countRecurringTemplates,
} from './simpleAccount'

describe('simpleAccount', () => {
  beforeEach(() => {
    vi.mocked(prisma.transaction.count).mockReset()
  })

  describe('countRecurringTemplates', () => {
    it('zählt wiederkehrende Templates inkl. pausierter', async () => {
      vi.mocked(prisma.transaction.count).mockResolvedValue(2)

      const count = await countRecurringTemplates('acc-1')

      expect(count).toBe(2)
      expect(prisma.transaction.count).toHaveBeenCalledWith({
        where: { accountId: 'acc-1', isRecurring: true },
      })
    })
  })

  describe('assertCanEnableSimpleAccount', () => {
    it('blockiert bei vorhandenen Templates', async () => {
      vi.mocked(prisma.transaction.count).mockResolvedValue(1)

      const result = await assertCanEnableSimpleAccount('acc-1')

      expect(result).toBeInstanceOf(NextResponse)
      if (result instanceof NextResponse) {
        expect(result.status).toBe(400)
        const body = await result.json()
        expect(body.error).toBe(SIMPLE_ACCOUNT_RECURRING_BLOCK_MESSAGE)
      }
    })

    it('erlaubt Aktivierung ohne Templates', async () => {
      vi.mocked(prisma.transaction.count).mockResolvedValue(0)

      expect(await assertCanEnableSimpleAccount('acc-1')).toBeNull()
    })
  })

  describe('assertPlanningAccount', () => {
    it('gibt 403 für einfache Konten zurück', () => {
      const result = assertPlanningAccount({ isSimpleAccount: true })

      expect(result).toBeInstanceOf(NextResponse)
      if (result instanceof NextResponse) {
        expect(result.status).toBe(403)
      }
    })

    it('erlaubt Planungskonten', () => {
      expect(assertPlanningAccount({ isSimpleAccount: false })).toBeNull()
    })
  })

  describe('assertRecurringNotAllowed', () => {
    it('nutzt dieselbe Planungs-Prüfung', async () => {
      const result = assertRecurringNotAllowed({ isSimpleAccount: true })
      expect(result).toBeInstanceOf(NextResponse)
      if (result instanceof NextResponse) {
        const body = await result.json()
        expect(body.error).toBe(SIMPLE_ACCOUNT_PLANNING_FORBIDDEN_MESSAGE)
      }
    })
  })

  describe('assertOwnerForSimpleAccountToggle', () => {
    it('erlaubt OWNER', () => {
      expect(assertOwnerForSimpleAccountToggle(AccountMemberRole.OWNER)).toBeNull()
    })

    it('blockiert MEMBER und READ_ONLY', () => {
      expect(
        assertOwnerForSimpleAccountToggle(AccountMemberRole.MEMBER)
      ).toBeInstanceOf(NextResponse)
      expect(
        assertOwnerForSimpleAccountToggle(AccountMemberRole.READ_ONLY)
      ).toBeInstanceOf(NextResponse)
    })
  })
})
