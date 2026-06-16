export type SplitExpenseInput = {
  id: string
  amount: number
  paidByParticipantId: string
  shareParticipantIds: string[]
}

export type SplitSettlementInput = {
  fromParticipantId: string
  toParticipantId: string
  amount: number
}

export type ParticipantInfo = {
  id: string
  displayName: string
}

export type BalanceEntry = {
  participantId: string
  displayName: string
  paid: number
  owed: number
  net: number
}

export type DebtSuggestion = {
  fromParticipantId: string
  fromDisplayName: string
  toParticipantId: string
  toDisplayName: string
  amount: number
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export function computeParticipantBalances(
  participants: ParticipantInfo[],
  expenses: SplitExpenseInput[],
  settlements: SplitSettlementInput[] = []
): BalanceEntry[] {
  const nameById = new Map(participants.map((p) => [p.id, p.displayName]))
  const paid = new Map<string, number>()
  const owed = new Map<string, number>()

  for (const participant of participants) {
    paid.set(participant.id, 0)
    owed.set(participant.id, 0)
  }

  for (const expense of expenses) {
    const amount = roundMoney(expense.amount)
    if (amount <= 0) continue

    paid.set(
      expense.paidByParticipantId,
      roundMoney((paid.get(expense.paidByParticipantId) ?? 0) + amount)
    )

    const shares =
      expense.shareParticipantIds.length > 0
        ? expense.shareParticipantIds
        : participants.map((p) => p.id)

    if (shares.length === 0) continue

    const shareAmount = roundMoney(amount / shares.length)
    let allocated = 0

    for (let i = 0; i < shares.length; i++) {
      const participantId = shares[i]
      const portion =
        i === shares.length - 1
          ? roundMoney(amount - allocated)
          : shareAmount
      allocated = roundMoney(allocated + portion)
      owed.set(participantId, roundMoney((owed.get(participantId) ?? 0) + portion))
    }
  }

  const netBalances = new Map<string, number>()
  for (const participant of participants) {
    const net = roundMoney(
      (paid.get(participant.id) ?? 0) - (owed.get(participant.id) ?? 0)
    )
    netBalances.set(participant.id, net)
  }

  for (const settlement of settlements) {
    const amount = roundMoney(settlement.amount)
    if (amount <= 0) continue

    netBalances.set(
      settlement.fromParticipantId,
      roundMoney((netBalances.get(settlement.fromParticipantId) ?? 0) + amount)
    )
    netBalances.set(
      settlement.toParticipantId,
      roundMoney((netBalances.get(settlement.toParticipantId) ?? 0) - amount)
    )
  }

  return participants.map((participant) => ({
    participantId: participant.id,
    displayName: nameById.get(participant.id) ?? participant.displayName,
    paid: paid.get(participant.id) ?? 0,
    owed: owed.get(participant.id) ?? 0,
    net: netBalances.get(participant.id) ?? 0,
  }))
}

export function simplifyDebts(balances: BalanceEntry[]): DebtSuggestion[] {
  const creditors: { id: string; name: string; amount: number }[] = []
  const debtors: { id: string; name: string; amount: number }[] = []

  for (const entry of balances) {
    const net = roundMoney(entry.net)
    if (net > 0.005) {
      creditors.push({
        id: entry.participantId,
        name: entry.displayName,
        amount: net,
      })
    } else if (net < -0.005) {
      debtors.push({
        id: entry.participantId,
        name: entry.displayName,
        amount: -net,
      })
    }
  }

  creditors.sort((a, b) => b.amount - a.amount)
  debtors.sort((a, b) => b.amount - a.amount)

  const suggestions: DebtSuggestion[] = []
  let ci = 0
  let di = 0

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci]
    const debtor = debtors[di]
    const amount = roundMoney(Math.min(creditor.amount, debtor.amount))

    if (amount > 0.005) {
      suggestions.push({
        fromParticipantId: debtor.id,
        fromDisplayName: debtor.name,
        toParticipantId: creditor.id,
        toDisplayName: creditor.name,
        amount,
      })
    }

    creditor.amount = roundMoney(creditor.amount - amount)
    debtor.amount = roundMoney(debtor.amount - amount)

    if (creditor.amount <= 0.005) ci++
    if (debtor.amount <= 0.005) di++
  }

  return suggestions
}

export function computeBalancesWithSuggestions(
  participants: ParticipantInfo[],
  expenses: SplitExpenseInput[],
  settlements: SplitSettlementInput[] = []
): { balances: BalanceEntry[]; suggestions: DebtSuggestion[] } {
  const balances = computeParticipantBalances(participants, expenses, settlements)
  const suggestions = simplifyDebts(balances)
  return { balances, suggestions }
}

export const DEFAULT_SPLIT_CATEGORIES = [
  { name: 'Essen', color: '#F4A261' },
  { name: 'Transport', color: '#2A9D8F' },
  { name: 'Unterkunft', color: '#457B9D' },
  { name: 'Sonstiges', color: '#A7C7E7' },
] as const
