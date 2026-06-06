export function getDuplicateBankIds(
  accounts: ReadonlyArray<{ bankId?: string | null }>
): Set<string> {
  const counts = new Map<string, number>()
  for (const acc of accounts) {
    if (!acc.bankId) continue
    counts.set(acc.bankId, (counts.get(acc.bankId) ?? 0) + 1)
  }
  return new Set(
    [...counts.entries()]
      .filter(([, count]) => count > 1)
      .map(([bankId]) => bankId)
  )
}
