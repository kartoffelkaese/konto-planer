import {
  ensureSplitCurrenciesFresh,
  isSupportedSplitCurrency,
} from '@/lib/splitCurrencies'

export type ExchangeRateResult = {
  currency: string
  rate: number
  rateDate: string
  eurAmount?: number
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

function formatFrankfurterDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function previousDay(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return formatFrankfurterDate(d)
}

async function fetchFrankfurterRate(
  currency: string,
  dateStr: string
): Promise<{ rate: number; rateDate: string }> {
  const url = `https://api.frankfurter.dev/v2/rate/${currency}/EUR?date=${dateStr}`
  const response = await fetch(url, {
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(10_000),
  })

  if (!response.ok) {
    throw new Error(`Wechselkurs für ${currency} am ${dateStr} nicht verfügbar`)
  }

  const data = (await response.json()) as {
    date?: string
    rate?: number
  }

  const rate = data.rate
  if (rate == null || !Number.isFinite(rate)) {
    throw new Error(`Wechselkurs für ${currency} am ${dateStr} nicht verfügbar`)
  }

  return { rate, rateDate: data.date ?? dateStr }
}

export async function getExchangeRateToEur(
  currencyCode: string,
  date: Date,
  amount?: number
): Promise<ExchangeRateResult> {
  const currency = currencyCode.toUpperCase()

  if (currency === 'EUR') {
    const rateDate = formatFrankfurterDate(date)
    return {
      currency,
      rate: 1,
      rateDate,
      eurAmount: amount != null ? roundMoney(amount) : undefined,
    }
  }

  await ensureSplitCurrenciesFresh()

  if (!isSupportedSplitCurrency(currency)) {
    throw new Error(`Währung ${currency} wird nicht unterstützt`)
  }

  const dateStr = formatFrankfurterDate(date)
  const todayStr = formatFrankfurterDate(new Date())

  let result: { rate: number; rateDate: string }
  try {
    result = await fetchFrankfurterRate(currency, dateStr)
  } catch (firstError) {
    if (dateStr === todayStr) {
      try {
        result = await fetchFrankfurterRate(currency, previousDay(dateStr))
      } catch {
        throw firstError
      }
    } else {
      throw firstError
    }
  }

  return {
    currency,
    rate: result.rate,
    rateDate: result.rateDate,
    eurAmount:
      amount != null ? roundMoney(amount * result.rate) : undefined,
  }
}

export { roundMoney as roundExchangeMoney }
