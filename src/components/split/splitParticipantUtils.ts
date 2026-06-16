export function getParticipantInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export type BalanceStatus = 'creditor' | 'debtor' | 'settled'

export function getBalanceStatus(net: number): BalanceStatus {
  if (net > 0.005) return 'creditor'
  if (net < -0.005) return 'debtor'
  return 'settled'
}

export function getBalanceStatusLabel(status: BalanceStatus): string {
  switch (status) {
    case 'creditor':
      return 'Bekommt zurück'
    case 'debtor':
      return 'Schuldet noch'
    case 'settled':
      return 'Ausgeglichen'
  }
}
