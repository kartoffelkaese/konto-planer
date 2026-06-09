/** Parst deutsche Beträge: "1.234,56", "-12,99 €", "12,99" */
export function parseGermanAmount(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  let s = trimmed.replace(/\s/g, '').replace(/€/g, '')
  const negative = s.startsWith('-') || s.startsWith('(')
  s = s.replace(/^\(|\)$/g, '').replace(/^-/, '')

  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.')
  }

  const value = Number.parseFloat(s)
  if (Number.isNaN(value)) return null

  return negative ? -Math.abs(value) : value
}
