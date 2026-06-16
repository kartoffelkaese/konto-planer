import { describe, expect, it } from 'vitest'
import {
  computeParticipantBalances,
  simplifyDebts,
  computeBalancesWithSuggestions,
} from '@/lib/splitBalances'

const participants = [
  { id: 'a', displayName: 'Anna' },
  { id: 'b', displayName: 'Ben' },
  { id: 'c', displayName: 'Clara' },
]

describe('computeParticipantBalances', () => {
  it('splits equally among all when no shares specified', () => {
    const balances = computeParticipantBalances(participants, [
      {
        id: 'e1',
        amount: 90,
        paidByParticipantId: 'a',
        shareParticipantIds: [],
      },
    ])

    expect(balances.find((b) => b.participantId === 'a')?.net).toBe(60)
    expect(balances.find((b) => b.participantId === 'b')?.net).toBe(-30)
    expect(balances.find((b) => b.participantId === 'c')?.net).toBe(-30)
  })

  it('splits among selected participants only', () => {
    const balances = computeParticipantBalances(participants, [
      {
        id: 'e1',
        amount: 100,
        paidByParticipantId: 'a',
        shareParticipantIds: ['a', 'b'],
      },
    ])

    expect(balances.find((b) => b.participantId === 'a')?.net).toBe(50)
    expect(balances.find((b) => b.participantId === 'b')?.net).toBe(-50)
    expect(balances.find((b) => b.participantId === 'c')?.net).toBe(0)
  })

  it('applies settlements to net balances', () => {
    const balances = computeParticipantBalances(
      participants,
      [
        {
          id: 'e1',
          amount: 90,
          paidByParticipantId: 'a',
          shareParticipantIds: [],
        },
      ],
      [{ fromParticipantId: 'b', toParticipantId: 'a', amount: 30 }]
    )

    expect(balances.find((b) => b.participantId === 'a')?.net).toBe(30)
    expect(balances.find((b) => b.participantId === 'b')?.net).toBe(0)
    expect(balances.find((b) => b.participantId === 'c')?.net).toBe(-30)
  })
})

describe('simplifyDebts', () => {
  it('minimizes payments for three people', () => {
    const { balances, suggestions } = computeBalancesWithSuggestions(
      participants,
      [
        {
          id: 'e1',
          amount: 90,
          paidByParticipantId: 'a',
          shareParticipantIds: [],
        },
      ]
    )

    expect(balances.find((b) => b.participantId === 'a')?.net).toBe(60)
    expect(suggestions).toHaveLength(2)
    expect(suggestions.reduce((sum, s) => sum + s.amount, 0)).toBe(60)
  })
})
