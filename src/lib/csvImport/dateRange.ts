import { parseGermanDate, formatDateIso } from './parseDate'

export type ImportDateRange = {
  start: Date
  end: Date
}

export type ImportDateRangeIso = {
  start: string
  end: string
}

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

/** Liest „Zeitraum:“ aus Bank-CSV-Metadaten (z. B. `10.06.2026 - 11.06.2026`). */
export function parseZeitraumFromCsv(csvText: string): ImportDateRange | null {
  for (const line of csvText.split(/\r?\n/)) {
    if (!/zeitraum/i.test(line)) continue

    const match = line.match(
      /(\d{1,2}\.\d{1,2}\.\d{2,4})\s*-\s*(\d{1,2}\.\d{1,2}\.\d{2,4})/
    )
    if (!match) continue

    const start = parseGermanDate(match[1])
    const end = parseGermanDate(match[2])
    if (!start || !end) continue

    return {
      start: startOfDay(start),
      end: endOfDay(end <= start ? start : end),
    }
  }

  return null
}

/**
 * Datumsbereich für Duplikat-DB-Abfrage: primär Min/Max aller Buchungsdaten,
 * Fallback format-spezifische Metadaten oder Zeitraum (DKB).
 */
export function getImportDateRange(
  rows: Array<{ date: Date | null }>,
  csvText?: string,
  parseMetadata?: (csvText: string) => ImportDateRange | null
): ImportDateRange | null {
  const dates = rows
    .map((row) => row.date)
    .filter((date): date is Date => date !== null)

  if (dates.length > 0) {
    const min = dates.reduce((a, b) => (a.getTime() < b.getTime() ? a : b))
    const max = dates.reduce((a, b) => (a.getTime() > b.getTime() ? a : b))
    return { start: startOfDay(min), end: endOfDay(max) }
  }

  if (csvText?.trim()) {
    if (parseMetadata) {
      const fromFormat = parseMetadata(csvText)
      if (fromFormat) return fromFormat
    }
    return parseZeitraumFromCsv(csvText)
  }

  return null
}

export function toImportDateRangeIso(
  range: ImportDateRange | null
): ImportDateRangeIso | null {
  if (!range) return null
  return {
    start: formatDateIso(range.start),
    end: formatDateIso(range.end),
  }
}
