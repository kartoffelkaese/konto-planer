export function normalizeMerchantName(name: string): string {
  return name.trim().toLowerCase()
}

export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const temp = row[j]
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost)
      prev = temp
    }
  }
  return row[b.length]
}

export function merchantNameSimilarity(a: string, b: string): number {
  const left = normalizeMerchantName(a)
  const right = normalizeMerchantName(b)
  if (!left || !right) return 0
  if (left === right) return 1

  if (left.includes(right) || right.includes(left)) {
    return Math.min(left.length, right.length) / Math.max(left.length, right.length)
  }

  const distance = levenshteinDistance(left, right)
  const maxLen = Math.max(left.length, right.length)
  return 1 - distance / maxLen
}

const SIMILARITY_THRESHOLD = 0.82

export function findExactMerchantMatch<T extends { id: string; name: string }>(
  merchants: T[],
  input: string
): T | undefined {
  const norm = normalizeMerchantName(input)
  if (!norm) return undefined
  return merchants.find((m) => normalizeMerchantName(m.name) === norm)
}

export function findSimilarMerchant<T extends { id: string; name: string }>(
  merchants: T[],
  input: string
): T | undefined {
  const norm = normalizeMerchantName(input)
  if (norm.length < 2) return undefined
  if (findExactMerchantMatch(merchants, input)) return undefined

  let best: { merchant: T; score: number } | undefined

  for (const merchant of merchants) {
    const score = merchantNameSimilarity(norm, merchant.name)
    if (score >= SIMILARITY_THRESHOLD && (!best || score > best.score)) {
      best = { merchant, score }
    }
  }

  return best?.merchant
}
