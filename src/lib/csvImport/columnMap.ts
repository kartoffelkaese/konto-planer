import { normalizeHeaderLabel } from './headerDetection'

export function normalizeHeader(header: string): string {
  return normalizeHeaderLabel(header)
}

export function findColumnKey(
  row: Record<string, string>,
  candidates: string[]
): string | undefined {
  const keys = Object.keys(row)
  for (const candidate of candidates) {
    const normCandidate = normalizeHeader(candidate)
    const found = keys.find((k) => normalizeHeader(k) === normCandidate)
    if (found) return found
  }
  return undefined
}

export function getCell(row: Record<string, string>, candidates: string[]): string {
  const key = findColumnKey(row, candidates)
  return key ? (row[key] ?? '').trim() : ''
}

/** Prüft, ob alle Spaltengruppen (jeweils Aliase für ein Feld) in den Headern vorkommen. */
export function requiresColumns(
  headers: string[],
  ...columnGroups: string[][]
): boolean {
  const normalized = headers.map(normalizeHeader)
  return columnGroups.every((group) =>
    group.some((candidate) => normalized.includes(normalizeHeader(candidate)))
  )
}

export function findHeaderColumnOffsetForMarkers(
  fields: string[],
  markers: string[]
): number {
  const normalizedMarkers = markers.map(normalizeHeader)
  const idx = fields.findIndex((field) =>
    normalizedMarkers.includes(normalizeHeader(field))
  )
  return idx >= 0 ? idx : 0
}

export function isHeaderLine(fields: string[], markers: string[]): boolean {
  const normalizedMarkers = markers.map(normalizeHeader)
  return fields.some((field) => normalizedMarkers.includes(normalizeHeader(field)))
}
