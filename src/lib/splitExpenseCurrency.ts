import { getExchangeRateToEur, roundExchangeMoney } from '@/lib/exchangeRates'
import { prisma } from '@/lib/prisma'

export type ExpenseCurrencyInput = {
  inputCurrency?: string
  amount: number
  date: Date
}

export type ResolvedExpenseAmounts = {
  amount: number
  originalAmount: number | null
  originalCurrencyCode: string | null
  exchangeRate: number | null
  exchangeRateDate: Date | null
}

export async function resolveExpenseAmounts(
  splitListId: string,
  input: ExpenseCurrencyInput
): Promise<ResolvedExpenseAmounts | { error: string; status: number }> {
  const inputCurrency = (input.inputCurrency ?? 'EUR').toUpperCase()

  if (inputCurrency === 'EUR') {
    return {
      amount: roundExchangeMoney(input.amount),
      originalAmount: null,
      originalCurrencyCode: null,
      exchangeRate: null,
      exchangeRateDate: null,
    }
  }

  const listCurrency = await prisma.splitListCurrency.findFirst({
    where: { splitListId, currencyCode: inputCurrency },
  })

  if (!listCurrency) {
    return {
      error: `Währung ${inputCurrency} ist für diese Liste nicht konfiguriert`,
      status: 400,
    }
  }

  try {
    const rate = await getExchangeRateToEur(
      inputCurrency,
      input.date,
      input.amount
    )

    if (rate.eurAmount == null) {
      return { error: 'Umrechnung fehlgeschlagen', status: 502 }
    }

    return {
      amount: rate.eurAmount,
      originalAmount: roundExchangeMoney(input.amount),
      originalCurrencyCode: inputCurrency,
      exchangeRate: rate.rate,
      exchangeRateDate: new Date(`${rate.rateDate}T12:00:00.000Z`),
    }
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Wechselkurs konnte nicht geladen werden'
    return { error: message, status: 502 }
  }
}
