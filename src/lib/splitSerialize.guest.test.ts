import { describe, expect, it } from 'vitest'
import {
  serializeExpenseForGuest,
  serializeListForGuest,
  serializeParticipantForGuest,
} from '@/lib/splitSerialize'

describe('split guest serializers', () => {
  const participant = {
    id: 'p1',
    splitListId: 'l1',
    displayName: 'Martin',
    userId: 'u1',
    sortOrder: 0,
    createdAt: new Date('2025-06-01T12:00:00.000Z'),
  }

  it('omits account metadata from participants', () => {
    const guest = serializeParticipantForGuest(participant)
    expect(guest).toEqual({
      id: 'p1',
      splitListId: 'l1',
      displayName: 'Martin',
      sortOrder: 0,
      createdAt: '2025-06-01T12:00:00.000Z',
    })
    expect(guest).not.toHaveProperty('userId')
    expect(guest).not.toHaveProperty('hasAccount')
    expect(guest).not.toHaveProperty('pendingInvite')
  })

  it('omits createdById from guest expenses', () => {
    const expense = serializeExpenseForGuest({
      id: 'e1',
      splitListId: 'l1',
      paidByParticipantId: 'p1',
      categoryId: null,
      amount: { toString: () => '12.5' },
      description: 'Pizza',
      date: new Date('2025-06-02T12:00:00.000Z'),
      createdById: 'secret-user',
      createdAt: new Date('2025-06-02T12:00:00.000Z'),
      paidBy: participant,
      category: null,
      shares: [{ participantId: 'p1' }],
    })
    expect(expense.createdById).toBe('')
    expect(expense.paidBy).not.toHaveProperty('userId')
  })

  it('serializes guest list without role or invites', () => {
    const list = serializeListForGuest({
      id: 'l1',
      name: 'Urlaub',
      description: null,
      status: 'ACTIVE',
      participants: [participant],
      categories: [],
    })
    expect(list).not.toHaveProperty('role')
    expect(list.participants[0]).not.toHaveProperty('userId')
  })
})
