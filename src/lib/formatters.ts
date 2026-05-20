export const formatCurrency = (amount: number): string => {
  // -0 und Rundungsreste → 0,00 € ohne Minus
  const normalized = Math.round(amount * 100) / 100 === 0 ? 0 : amount

  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(normalized)
}

export const formatNumber = (number: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(number)
} 