import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import {
  formatDate,
  formatDateForInput,
  getCalendarMonthRange,
  getCalendarMonthLabel,
  getSalaryMonthPeriodInfo,
} from '@/lib/dateUtils'

dayjs.extend(utc)
dayjs.extend(timezone)

const DEFAULT_TIMEZONE = 'Europe/Berlin'

/** Entfernte Rolling-Presets (Legacy-URLs) werden auf `all` abgebildet. */
const LEGACY_PERIODS = new Set(['1month', '3months', '6months', '1year'])

export const TRANSACTION_PERIODS = ['all', 'current', 'custom'] as const

export type TransactionPeriod = (typeof TRANSACTION_PERIODS)[number]

export type TransactionPeriodRange = {
  gte: Date
  lte: Date
  label: string
}

export type ResolveTransactionPeriodInput = {
  period: TransactionPeriod | string | null | undefined
  startDate?: string | null
  endDate?: string | null
  salaryDay: number
  isSimpleAccount: boolean
}

export function isValidTransactionPeriod(
  value: string | null | undefined
): value is TransactionPeriod {
  return (
    value !== null &&
    value !== undefined &&
    TRANSACTION_PERIODS.includes(value as TransactionPeriod)
  )
}

function coercePeriod(value: string | null | undefined): TransactionPeriod {
  if (value && LEGACY_PERIODS.has(value)) return 'all'
  return isValidTransactionPeriod(value) ? value : 'all'
}

/** Liest Period-Parameter aus URL (inkl. Legacy filterSalaryMonth=1). */
export function parsePeriodFromUrl(searchParams: {
  get: (key: string) => string | null
}): {
  period: TransactionPeriod
  startDate: string
  endDate: string
} {
  if (searchParams.get('filterSalaryMonth') === '1') {
    return { period: 'current', startDate: '', endDate: '' }
  }

  return {
    period: coercePeriod(searchParams.get('period')),
    startDate: searchParams.get('from') ?? '',
    endDate: searchParams.get('to') ?? '',
  }
}

export function normalizeTransactionPeriod(
  period: string | null | undefined,
  filterSalaryMonth?: boolean
): TransactionPeriod {
  if (filterSalaryMonth) return 'current'
  return coercePeriod(period)
}

function parseCustomRange(
  startDate: string,
  endDate: string
): TransactionPeriodRange | null {
  if (!startDate || !endDate) return null

  const start = dayjs.tz(startDate, DEFAULT_TIMEZONE).startOf('day')
  const end = dayjs.tz(endDate, DEFAULT_TIMEZONE).endOf('day')

  if (!start.isValid() || !end.isValid() || start.isAfter(end, 'day')) {
    return null
  }

  return {
    gte: start.utc().toDate(),
    lte: end.utc().toDate(),
    label: `${formatDate(start.toDate())} – ${formatDate(end.toDate())}`,
  }
}

function currentPeriodRange(
  salaryDay: number,
  isSimpleAccount: boolean
): TransactionPeriodRange {
  if (isSimpleAccount) {
    const { startDate, endDate } = getCalendarMonthRange()
    return {
      gte: startDate,
      lte: endDate,
      label: getCalendarMonthLabel(),
    }
  }

  const info = getSalaryMonthPeriodInfo(salaryDay)
  return {
    gte: info.startDate,
    lte: info.endDate,
    label: info.rangeLabel,
  }
}

/**
 * Löst einen Perioden-Preset in einen Datumsbereich auf.
 * `all` → null (kein Filter für die Transaktionsliste).
 * `custom` ohne vollständige Daten → null.
 */
export function resolveTransactionPeriodRange(
  input: ResolveTransactionPeriodInput
): TransactionPeriodRange | null {
  const period = normalizeTransactionPeriod(input.period)

  switch (period) {
    case 'all':
      return null
    case 'current':
      return currentPeriodRange(input.salaryDay, input.isSimpleAccount)
    case 'custom':
      return parseCustomRange(input.startDate ?? '', input.endDate ?? '')
    default:
      return null
  }
}

/** KPI-Zeitraum: bei `all` aktueller Gehalts-/Kalendermonat. */
export function resolveTransactionPeriodRangeForTotals(
  input: ResolveTransactionPeriodInput
): TransactionPeriodRange {
  const period = normalizeTransactionPeriod(input.period)
  if (period === 'all') {
    return currentPeriodRange(input.salaryDay, input.isSimpleAccount)
  }
  const resolved = resolveTransactionPeriodRange(input)
  if (resolved) return resolved
  return currentPeriodRange(input.salaryDay, input.isSimpleAccount)
}

export function getTransactionPeriodOptions(isSimpleAccount: boolean) {
  return [
    { value: 'all' as const, label: 'Alle Buchungen' },
    {
      value: 'current' as const,
      label: isSimpleAccount ? 'Nur Kalendermonat' : 'Nur Gehaltsmonat',
    },
    { value: 'custom' as const, label: 'Benutzerdefiniert' },
  ]
}

export function isCustomPeriodIncomplete(
  period: TransactionPeriod,
  startDate: string,
  endDate: string
): boolean {
  return (
    period === 'custom' &&
    getCustomPeriodValidation(startDate, endDate).status === 'incomplete'
  )
}

export type CustomPeriodValidation = {
  status: 'complete' | 'incomplete' | 'invalid'
  message: string
}

export function getCustomPeriodValidation(
  startDate: string,
  endDate: string
): CustomPeriodValidation {
  if (!startDate && !endDate) {
    return {
      status: 'incomplete',
      message: 'Bitte wählen Sie einen Datumszeitraum.',
    }
  }
  if (!startDate) {
    return {
      status: 'incomplete',
      message: 'Bitte wählen Sie noch ein Startdatum.',
    }
  }
  if (!endDate) {
    return {
      status: 'incomplete',
      message: 'Bitte wählen Sie noch ein Enddatum.',
    }
  }

  const start = dayjs.tz(startDate, DEFAULT_TIMEZONE).startOf('day')
  const end = dayjs.tz(endDate, DEFAULT_TIMEZONE).startOf('day')

  if (!start.isValid() || !end.isValid()) {
    return { status: 'invalid', message: 'Mindestens ein Datum ist ungültig.' }
  }
  if (start.isAfter(end, 'day')) {
    return {
      status: 'invalid',
      message: 'Das Startdatum darf nicht nach dem Enddatum liegen.',
    }
  }

  return { status: 'complete', message: '' }
}

export function isCustomPeriodBlocked(
  period: TransactionPeriod,
  startDate: string,
  endDate: string
): boolean {
  if (period !== 'custom') return false
  return getCustomPeriodValidation(startDate, endDate).status !== 'complete'
}

/** Voreinstellung beim Wechsel auf „Benutzerdefiniert“. */
export function getDefaultCustomPeriodRange(): {
  startDate: string
  endDate: string
} {
  const now = dayjs().tz(DEFAULT_TIMEZONE)
  return {
    startDate: formatDateForInput(now.startOf('month').toDate()),
    endDate: formatDateForInput(now.toDate()),
  }
}

export function isPeriodFilterActive(period: TransactionPeriod): boolean {
  return period !== 'all'
}

/** Legacy-API: filterSalaryMonth=true entspricht period=current */
export function resolvePeriodFromRequest(searchParams: URLSearchParams): {
  period: TransactionPeriod
  startDate: string | null
  endDate: string | null
} {
  const filterSalaryMonth =
    searchParams.get('filterSalaryMonth') === 'true' ||
    searchParams.get('filterSalaryMonth') === '1'

  if (filterSalaryMonth) {
    return { period: 'current', startDate: null, endDate: null }
  }

  return {
    period: coercePeriod(searchParams.get('period')),
    startDate: searchParams.get('startDate'),
    endDate: searchParams.get('endDate'),
  }
}
