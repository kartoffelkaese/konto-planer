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

/** Nur Buchstaben/Ziffern, Kleinbuchstaben – für Bank-CSV-Texte. */
export function alphanumericKey(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9äöüß]/g, '')
}

export type MerchantMatchConfidence = 'exact' | 'contains' | 'similar' | null

export type MerchantInBankTextMatch<T extends { id: string; name: string }> = {
  merchant: T
  confidence: Exclude<MerchantMatchConfidence, null>
}

const MIN_CONTAINS_MERCHANT_LEN = 3

const CONFIDENCE_RANK: Record<
  Exclude<MerchantMatchConfidence, null>,
  number
> = {
  exact: 3,
  contains: 2,
  similar: 1,
}

/** Sucht in mehreren Texten (z. B. Zahlungsempfänger + Verwendungszweck) – bestes Ergebnis. */
export function findMerchantInBankTexts<T extends { id: string; name: string }>(
  merchants: T[],
  texts: string[]
): MerchantInBankTextMatch<T> | null {
  let best: (MerchantInBankTextMatch<T> & { score: number }) | null = null

  for (const text of texts) {
    const match = findMerchantInBankText(merchants, text)
    if (!match) continue

    const score = CONFIDENCE_RANK[match.confidence]
    if (
      !best ||
      score > best.score ||
      (score === best.score &&
        alphanumericKey(match.merchant.name).length >
          alphanumericKey(best.merchant.name).length)
    ) {
      best = { ...match, score }
    }
  }

  return best ? { merchant: best.merchant, confidence: best.confidence } : null
}

export function findMerchantInBankText<T extends { id: string; name: string }>(
  merchants: T[],
  rawText: string
): MerchantInBankTextMatch<T> | null {
  const trimmed = rawText.trim()
  if (!trimmed) return null

  const exact = findExactMerchantMatch(merchants, trimmed)
  if (exact) return { merchant: exact, confidence: 'exact' }

  const textKey = alphanumericKey(trimmed)
  if (textKey.length >= MIN_CONTAINS_MERCHANT_LEN) {
    let bestContains: { merchant: T; keyLen: number } | undefined

    for (const merchant of merchants) {
      const merchantKey = alphanumericKey(merchant.name)
      if (merchantKey.length < MIN_CONTAINS_MERCHANT_LEN) continue
      if (!textKey.includes(merchantKey)) continue
      if (!bestContains || merchantKey.length > bestContains.keyLen) {
        bestContains = { merchant, keyLen: merchantKey.length }
      }
    }

    if (bestContains) {
      return { merchant: bestContains.merchant, confidence: 'contains' }
    }
  }

  const normText = normalizeMerchantName(trimmed)
  for (const merchant of merchants) {
    const normMerchant = normalizeMerchantName(merchant.name)
    if (normMerchant.length < MIN_CONTAINS_MERCHANT_LEN) continue
    const tokenPattern = new RegExp(
      `(^|[^a-z0-9äöüß])${escapeRegExp(normMerchant)}([^a-z0-9äöüß]|$)`,
      'i'
    )
    if (tokenPattern.test(normText)) {
      return { merchant, confidence: 'contains' }
    }
  }

  const similar = findSimilarMerchant(merchants, trimmed)
  if (similar) return { merchant: similar, confidence: 'similar' }

  return null
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
