import { alphanumericKey, findMerchantInBankTexts } from '@/lib/merchantMatching'
import { suggestCategoryIdForMerchant } from '@/lib/suggestCategoryId'
import type { RecurringIntervalId } from '@/lib/recurringIntervals'

/**
 * Erkennt wiederkehrende Zahlungen in einem Kontoauszug (z. B. Bank-Export eines Jahres).
 *
 * Reine Regeln, keine Datenbank: Buchungen werden nach Richtung und Zahlungspartner gruppiert,
 * innerhalb der Gruppe nach Betrag getrennt und auf regelmäßige Abstände geprüft.
 */

export type DetectionRow = {
  date: Date | null
  amount: number | null
  merchantRaw: string
  description: string
}

export type DetectionMerchant = {
  id: string
  name: string
  categoryIds?: string[]
  categories?: Array<{ id: string }>
}

export type DetectionTemplate = {
  id: string
  amount: number | { toString(): string }
  merchantId: string | null
  merchant: string
}

export type DetectionConfidence = 'high' | 'medium' | 'low'
export type DetectionStatus = 'active' | 'ended' | 'existing'

export type RecurringSuggestion = {
  /** Stabile Kennung innerhalb einer Auswertung */
  key: string
  direction: 'income' | 'expense'
  name: string
  merchantId: string | null
  categoryId: string | null
  /** Vorgeschlagener Betrag mit Vorzeichen (Ausgaben negativ) */
  amount: number
  /** Kleinster und größter beobachteter Betrag (ohne Vorzeichen) */
  amountMin: number
  amountMax: number
  variable: boolean
  /** Betrag hat sich geändert und ist seitdem gleich (z. B. Preiserhöhung) – vorgeschlagen wird der aktuelle */
  amountChanged: boolean
  /** Betrag vor der Änderung (ohne Vorzeichen) */
  previousAmount: number | null
  interval: RecurringIntervalId
  /** Letzte beobachtete Buchung – bestimmt den Tag der künftigen Termine */
  date: string
  firstDate: string
  occurrences: number
  confidence: DetectionConfidence
  status: DetectionStatus
  existingTemplateId: string | null
  preselected: boolean
}

export type SalaryDaySuggestion = { day: number; name: string }

export type DetectionResult = {
  suggestions: RecurringSuggestion[]
  salaryDaySuggestion: SalaryDaySuggestion | null
}

export type DetectionOptions = {
  merchants?: DetectionMerchant[]
  templates?: DetectionTemplate[]
  /** Ende des ausgewerteten Zeitraums; ohne Angabe die letzte Buchung */
  periodEnd?: Date | null
  /** Eingestellter Gehaltstag – ein gleicher Vorschlag entfällt */
  salaryDay?: number | null
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Erwarteter Abstand, erlaubte Abweichung und Mindestanzahl je Intervall */
const INTERVALS: Array<{
  id: RecurringIntervalId
  step: number
  tolerance: number
  minCount: number
  /** Bereich des mittleren Abstands, in dem dieses Intervall in Frage kommt */
  range: [number, number]
}> = [
  { id: 'monthly', step: 30.44, tolerance: 5, minCount: 3, range: [26, 35] },
  { id: 'quarterly', step: 91.31, tolerance: 8, minCount: 3, range: [83, 100] },
  { id: 'semiannual', step: 182.62, tolerance: 12, minCount: 2, range: [168, 197] },
  { id: 'yearly', step: 365.25, tolerance: 15, minCount: 2, range: [348, 382] },
]

/** Beträge, die mehr als das auseinanderliegen, gelten als verschiedene Zahlungen */
const AMOUNT_CLUSTER_RATIO = 0.15
/** Bis hierhin gilt ein Betrag als fest */
const FIXED_AMOUNT_TOLERANCE = { ratio: 0.01, absolute: 1 }

type Entry = { date: Date; amount: number; merchantRaw: string }

type Group = {
  direction: 'income' | 'expense'
  merchant: DetectionMerchant | null
  rawKey: string
  entries: Entry[]
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS)
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function toIsoDay(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const DOMAIN_PATTERN = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.(de|com|org|net|eu|io|ai|at|ch|info|co|uk|fm|tv|me)$/i

/** Schreibweisen, die beim Umwandeln von GROSSBUCHSTABEN erhalten bleiben sollen */
const WORD_CASE: Record<string, string> = {
  GMBH: 'GmbH',
  AG: 'AG',
  UG: 'UG',
  KG: 'KG',
  OHG: 'OHG',
  SE: 'SE',
  EG: 'eG',
  'E.V.': 'e. V.',
  EV: 'e. V.',
  UND: 'und',
  '&': '&',
  CO: 'Co.',
  'CO.': 'Co.',
}

function titleCaseWord(word: string): string {
  const mapped = WORD_CASE[word.toUpperCase()]
  if (mapped) return mapped
  if (DOMAIN_PATTERN.test(word)) return word.toLowerCase()
  // Abkürzungen bleiben: höchstens zwei Buchstaben oder ohne Vokal (AI, AG, DKB, ZDF)
  const letters = word.replace(/[^\p{L}]/gu, '')
  if (letters.length <= 2 || !/[AEIOUÄÖÜY]/i.test(letters)) return word
  return word
    .toLowerCase()
    .replace(/(^|[-'’])(\p{L})/gu, (_, sep: string, letter: string) => sep + letter.toUpperCase())
}

/**
 * Macht aus dem Zahlungspartner im Banktext einen lesbaren Namen: Ort bei Kartenzahlungen
 * („NAME/ORT“), Postleitzahl mit Ort am Ende, Punkte statt Leerzeichen und durchgehende
 * Großschreibung werden bereinigt.
 */
export function cleanBankPartnerName(raw: string): string {
  let name = raw.replace(/\s+/g, ' ').trim()

  // Kartenzahlung: „HAENDLER/ORT“ – nur wenn der Teil nach dem letzten „/“ ein einzelnes Wort ist
  const slash = name.lastIndexOf('/')
  if (slash > 0 && !name.slice(slash + 1).includes(' ') && !name.slice(0, slash).endsWith(':')) {
    name = name.slice(0, slash).trim()
  }

  // Postleitzahl (auch „DE-12345“) mit Ort am Ende
  name = name.replace(/\s+(?:[A-Z]{2}-)?\d{4,5}\s+[\p{L}.\- ]+$/u, '').trim()

  // Punkte als Wortgrenzen („Lidl.sagt.Danke“), aber keine Webadressen
  if (!name.includes(' ') && name.includes('.') && !DOMAIN_PATTERN.test(name)) {
    name = name.replace(/\.+/g, ' ').trim()
  }

  // Durchgehend GROSS geschrieben → normale Schreibweise (einzelne Wörter wie „ADAC“ bleiben)
  const letters = name.replace(/[^\p{L}]/gu, '')
  if (letters.length >= 4 && letters === letters.toUpperCase()) {
    if (DOMAIN_PATTERN.test(name)) name = name.toLowerCase()
    else if (name.includes(' ')) name = name.split(' ').map(titleCaseWord).join(' ')
  }

  name = name.replace(/[\s,;:/-]+$/, '').trim()
  if (!name) name = raw.trim()
  return name.length > 60 ? `${name.slice(0, 59)}…` : name
}

/** Häufigste Schreibweise des Zahlungspartners, bereinigt */
function displayName(entries: Entry[]): string {
  const counts = new Map<string, number>()
  for (const entry of entries) {
    const name = entry.merchantRaw.replace(/\s+/g, ' ').trim()
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  const [best] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  return cleanBankPartnerName(best)
}

/** Teilt Buchungen nach Betrag in Gruppen ähnlicher Höhe */
function clusterByAmount(entries: Entry[]): Entry[][] {
  const sorted = [...entries].sort((a, b) => Math.abs(a.amount) - Math.abs(b.amount))
  const clusters: Entry[][] = []
  let current: Entry[] = []
  let base = 0
  for (const entry of sorted) {
    const value = Math.abs(entry.amount)
    if (current.length === 0 || value <= base * (1 + AMOUNT_CLUSTER_RATIO) + 1) {
      if (current.length === 0) base = value
      current.push(entry)
    } else {
      clusters.push(current)
      current = [entry]
      base = value
    }
  }
  if (current.length) clusters.push(current)
  return clusters
}

type Evaluation = {
  interval: (typeof INTERVALS)[number]
  entries: Entry[]
  fitRatio: number
  missing: number
}

/** Prüft, ob Buchungen in einem regelmäßigen Intervall kommen */
function evaluateInterval(entries: Entry[]): Evaluation | null {
  const sorted = [...entries].sort((a, b) => a.date.getTime() - b.date.getTime())
  // Mehrere Buchungen am selben Tag zählen einmal
  const unique = sorted.filter(
    (entry, index) => index === 0 || daysBetween(sorted[index - 1].date, entry.date) > 0
  )
  if (unique.length < 2) return null

  const gaps = unique.slice(1).map((entry, index) => daysBetween(unique[index].date, entry.date))
  const typicalGap = median(gaps)
  const interval = INTERVALS.find(
    (candidate) => typicalGap >= candidate.range[0] && typicalGap <= candidate.range[1]
  )
  if (!interval || unique.length < interval.minCount) return null

  let fits = 0
  let missing = 0
  for (const gap of gaps) {
    const steps = Math.max(1, Math.round(gap / interval.step))
    if (steps <= 2 && Math.abs(gap - steps * interval.step) <= interval.tolerance * steps) {
      fits += 1
      missing += steps - 1
    }
  }
  const fitRatio = fits / gaps.length
  // Eine ausgelassene Monatsbuchung ist erlaubt, bei längeren Intervallen keine
  const allowedMissing = interval.id === 'monthly' ? 1 : 0
  if (fitRatio < 0.75 || missing > allowedMissing) return null

  return { interval, entries: unique, fitRatio, missing }
}

function confidenceFor(evaluation: Evaluation, spread: number): DetectionConfidence {
  const count = evaluation.entries.length
  const steady = evaluation.fitRatio >= 0.9 && spread <= 0.2
  switch (evaluation.interval.id) {
    case 'monthly':
      if (steady && count >= 6) return 'high'
      return evaluation.fitRatio >= 0.75 && spread <= 0.5 ? 'medium' : 'low'
    case 'quarterly':
      if (steady && count >= 4) return 'high'
      return spread <= 0.5 ? 'medium' : 'low'
    default:
      // Halb- und ganzjährlich: nur zwei Beobachtungen im Jahr – höchstens „mittel“
      return spread <= 0.05 ? 'medium' : 'low'
  }
}

function findExistingTemplate(
  templates: DetectionTemplate[],
  group: Group,
  name: string,
  amountMin: number,
  amountMax: number
): DetectionTemplate | null {
  const nameKey = alphanumericKey(name)
  return (
    templates.find((template) => {
      const amount = Number(template.amount.toString())
      if ((amount < 0) !== (group.direction === 'expense')) return false
      const sameMerchant =
        (group.merchant && template.merchantId === group.merchant.id) ||
        alphanumericKey(template.merchant) === group.rawKey ||
        alphanumericKey(template.merchant) === nameKey
      if (!sameMerchant) return false
      const value = Math.abs(amount)
      return (
        value >= amountMin * (1 - AMOUNT_CLUSTER_RATIO) - 1 &&
        value <= amountMax * (1 + AMOUNT_CLUSTER_RATIO) + 1
      )
    }) ?? null
  )
}

function buildSuggestion(
  group: Group,
  evaluation: Evaluation,
  index: number,
  periodEnd: Date,
  templates: DetectionTemplate[]
): RecurringSuggestion {
  const { entries, interval } = evaluation
  const values = entries.map((entry) => Math.abs(entry.amount))
  const amountMin = Math.min(...values)
  const amountMax = Math.max(...values)
  const middle = median(values)
  const isFixed = (list: number[]) =>
    Math.max(...list) - Math.min(...list) <=
    Math.max(FIXED_AMOUNT_TOLERANCE.absolute, median(list) * FIXED_AMOUNT_TOLERANCE.ratio)
  // Preisänderung: die letzten drei Buchungen sind gleich – dann gilt der aktuelle Betrag
  const amountChanged = !isFixed(values) && values.length >= 4 && isFixed(values.slice(-3))
  const variable = !isFixed(values) && !amountChanged
  const last = entries[entries.length - 1]
  const value = variable ? round2(middle) : Math.abs(last.amount)
  const spread = variable && middle > 0 ? (amountMax - amountMin) / middle : 0

  const name = group.merchant?.name ?? displayName(entries)
  const existing = findExistingTemplate(templates, group, name, amountMin, amountMax)
  const ended = daysBetween(last.date, periodEnd) > interval.step * 1.5
  const status: DetectionStatus = existing ? 'existing' : ended ? 'ended' : 'active'
  const confidence = confidenceFor(evaluation, spread)
  const categoryId = suggestCategoryIdForMerchant(group.merchant) || null

  return {
    key: `${group.direction}:${group.merchant ? `m:${group.merchant.id}` : `r:${group.rawKey}`}:${index}`,
    direction: group.direction,
    name,
    merchantId: group.merchant?.id ?? null,
    categoryId,
    amount: group.direction === 'expense' ? -value : value,
    amountMin: round2(amountMin),
    amountMax: round2(amountMax),
    variable,
    amountChanged,
    previousAmount: amountChanged ? round2(values[0]) : null,
    interval: interval.id,
    date: toIsoDay(last.date),
    firstDate: toIsoDay(entries[0].date),
    occurrences: entries.length,
    confidence,
    status,
    existingTemplateId: existing?.id ?? null,
    preselected: status === 'active' && confidence !== 'low',
  }
}

function groupRows(rows: DetectionRow[], merchants: DetectionMerchant[]): Group[] {
  const groups = new Map<string, Group>()
  for (const row of rows) {
    if (!row.date || row.amount === null || row.amount === 0) continue
    const merchantRaw = row.merchantRaw.trim()
    const rawKey = alphanumericKey(merchantRaw)
    if (!rawKey) continue

    const texts = [merchantRaw]
    const purpose = row.description.trim()
    if (purpose && purpose !== merchantRaw) texts.push(purpose)
    const merchant = merchants.length ? findMerchantInBankTexts(merchants, texts)?.merchant ?? null : null

    const direction = row.amount < 0 ? 'expense' : 'income'
    const key = `${direction}|${merchant ? `m:${merchant.id}` : `r:${rawKey}`}`
    let group = groups.get(key)
    if (!group) {
      group = { direction, merchant, rawKey, entries: [] }
      groups.set(key, group)
    }
    group.entries.push({ date: row.date, amount: row.amount, merchantRaw })
  }
  return [...groups.values()]
}

/** Gehaltstag aus der größten regelmäßigen monatlichen Einnahme */
function suggestSalaryDay(
  suggestions: RecurringSuggestion[],
  evaluations: Map<string, Evaluation>,
  salaryDay: number | null | undefined
): SalaryDaySuggestion | null {
  const salary = suggestions
    .filter(
      (s) =>
        s.direction === 'income' &&
        s.interval === 'monthly' &&
        s.status !== 'ended' &&
        s.confidence !== 'low'
    )
    .sort((a, b) => b.amount - a.amount)[0]
  if (!salary) return null
  const days = evaluations.get(salary.key)!.entries.map((entry) => entry.date.getDate())
  const day = Math.round(median(days))
  return day === salaryDay ? null : { day, name: salary.name }
}

export function detectRecurringPayments(
  rows: DetectionRow[],
  options: DetectionOptions = {}
): DetectionResult {
  const { merchants = [], templates = [], salaryDay = null } = options
  const groups = groupRows(rows, merchants)

  const lastDate = rows.reduce<Date | null>(
    (latest, row) => (row.date && (!latest || row.date > latest) ? row.date : latest),
    null
  )
  const periodEnd =
    options.periodEnd && lastDate && options.periodEnd > lastDate
      ? options.periodEnd
      : lastDate ?? options.periodEnd ?? new Date()

  const suggestions: RecurringSuggestion[] = []
  const evaluations = new Map<string, Evaluation>()

  for (const group of groups) {
    if (group.entries.length < 2) continue
    const found: Evaluation[] = []
    for (const cluster of clusterByAmount(group.entries)) {
      const evaluation = evaluateInterval(cluster)
      if (evaluation) found.push(evaluation)
    }
    // Keine Teilgruppe regelmäßig: vielleicht regelmäßig mit schwankendem Betrag
    if (found.length === 0) {
      const evaluation = evaluateInterval(group.entries)
      if (evaluation) {
        const values = evaluation.entries.map((entry) => Math.abs(entry.amount))
        // Stark streuende Beträge (Einkäufe) sind keine wiederkehrende Zahlung
        if (Math.max(...values) <= Math.min(...values) * 3) found.push(evaluation)
      }
    }
    found.forEach((evaluation, index) => {
      const suggestion = buildSuggestion(group, evaluation, index, periodEnd, templates)
      suggestions.push(suggestion)
      evaluations.set(suggestion.key, evaluation)
    })
  }

  suggestions.sort(
    (a, b) =>
      (a.direction === b.direction ? 0 : a.direction === 'income' ? -1 : 1) ||
      Math.abs(b.amount) - Math.abs(a.amount)
  )

  return {
    suggestions,
    salaryDaySuggestion: suggestSalaryDay(suggestions, evaluations, salaryDay),
  }
}
