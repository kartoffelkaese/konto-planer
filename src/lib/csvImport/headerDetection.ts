/** Erkennt Kopfzeile und Spalten-Offset (z. B. wenn Überschriften erst ab Spalte 5 beginnen). */

export function normalizeHeaderLabel(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
}

const DEFAULT_HEADER_MARKERS = ['buchungsdatum', 'datum', 'buchung']

export function isHeaderField(field: string, markers: string[] = DEFAULT_HEADER_MARKERS): boolean {
  const normalized = normalizeHeaderLabel(field)
  return markers.map(normalizeHeaderLabel).includes(normalized)
}

export function findHeaderColumnOffset(
  fields: string[],
  markers: string[] = DEFAULT_HEADER_MARKERS
): number {
  const normalizedMarkers = markers.map(normalizeHeaderLabel)
  const idx = fields.findIndex((field) =>
    normalizedMarkers.includes(normalizeHeaderLabel(field))
  )
  return idx >= 0 ? idx : 0
}

export function collectHeaderMarkers(
  formatMarkers: Array<string[] | undefined>
): string[] {
  const set = new Set<string>()
  for (const group of formatMarkers) {
    for (const marker of group ?? []) {
      set.add(normalizeHeaderLabel(marker))
    }
  }
  if (set.size === 0) {
    DEFAULT_HEADER_MARKERS.forEach((m) => set.add(m))
  }
  return [...set]
}
