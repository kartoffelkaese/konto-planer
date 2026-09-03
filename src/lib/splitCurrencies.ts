import fallbackCurrencies from '@/data/frankfurter-currencies-fallback.json'

const FRANKFURTER_CURRENCIES_URL = 'https://api.frankfurter.dev/v2/currencies'

type FrankfurterCurrencyRecord = {
  iso_code: string
  name: string
}

export type SplitCurrencyOption = {
  code: string
  label: string
}

export const SPLIT_MAX_CURRENCIES_PER_LIST = 5

const CACHE_TTL_MS = 24 * 60 * 60 * 1000

const FRANKFURTER_CURRENCIES_FALLBACK: Record<string, string> =
  fallbackCurrencies

let currencyNamesByCode: Map<string, string> | null = null
let lastFetchedAt = 0
let refreshPromise: Promise<void> | null = null

function getCurrencyMap(): Map<string, string> {
  if (!currencyNamesByCode) {
    currencyNamesByCode = new Map(Object.entries(FRANKFURTER_CURRENCIES_FALLBACK))
  }
  return currencyNamesByCode
}

function parseFrankfurterCurrencies(data: FrankfurterCurrencyRecord[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const entry of data) {
    if (entry.iso_code) {
      map.set(entry.iso_code.toUpperCase(), entry.name)
    }
  }
  return map
}

export async function refreshSplitCurrencies(): Promise<void> {
  const response = await fetch(FRANKFURTER_CURRENCIES_URL, {
    next: { revalidate: 86400 },
    signal: AbortSignal.timeout(10_000),
  })

  if (!response.ok) {
    throw new Error('Währungsliste konnte nicht geladen werden')
  }

  const data = (await response.json()) as FrankfurterCurrencyRecord[]
  currencyNamesByCode = parseFrankfurterCurrencies(data)
  lastFetchedAt = Date.now()
}

export async function ensureSplitCurrenciesFresh(): Promise<void> {
  if (Date.now() - lastFetchedAt < CACHE_TTL_MS) return

  if (!refreshPromise) {
    refreshPromise = refreshSplitCurrencies()
      .catch(() => {
        // Keep fallback map on failure.
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  await refreshPromise
}

export function isSupportedSplitCurrency(code: string): boolean {
  const upper = code.toUpperCase()
  if (upper === 'EUR') return true
  return getCurrencyMap().has(upper)
}

export function getSplitCurrencyLabel(code: string): string {
  const upper = code.toUpperCase()
  const name = getCurrencyMap().get(upper)
  return name ? `${name} (${upper})` : upper
}

export function getAllSplitCurrencies(): SplitCurrencyOption[] {
  return [...getCurrencyMap().entries()]
    .filter(([code]) => code !== 'EUR')
    .sort((a, b) => a[1].localeCompare(b[1], 'de'))
    .map(([code, name]) => ({
      code,
      label: `${name} (${code})`,
    }))
}

export function normalizeForeignCurrencyCodes(codes: string[]): string[] {
  const seen = new Set<string>()
  const normalized: string[] = []

  for (const raw of codes) {
    const code = raw.trim().toUpperCase()
    if (!code || code === 'EUR' || seen.has(code)) continue
    seen.add(code)
    normalized.push(code)
  }

  return normalized
}

export function validateForeignCurrencyCodes(
  codes: string[]
):
  | { ok: true; codes: string[] }
  | { ok: false; error: string } {
  const normalized = normalizeForeignCurrencyCodes(codes)

  if (normalized.length > SPLIT_MAX_CURRENCIES_PER_LIST) {
    return {
      ok: false,
      error: `Maximal ${SPLIT_MAX_CURRENCIES_PER_LIST} Fremdwährungen pro Liste`,
    }
  }

  for (const code of normalized) {
    if (!isSupportedSplitCurrency(code)) {
      return { ok: false, error: `Währung ${code} wird nicht unterstützt` }
    }
  }

  return { ok: true, codes: normalized }
}
