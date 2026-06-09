/** Erkennt Kopfzeile und Spalten-Offset (z. B. wenn Überschriften erst ab Spalte 5 beginnen). */

export function normalizeHeaderLabel(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
}

const HEADER_MARKER = 'buchungsdatum'

export function isHeaderField(field: string): boolean {
  return normalizeHeaderLabel(field) === HEADER_MARKER
}

export function findHeaderColumnOffset(fields: string[]): number {
  const idx = fields.findIndex((field) => isHeaderField(field))
  return idx >= 0 ? idx : 0
}
