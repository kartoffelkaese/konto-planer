import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import {
  isValidTransactionPeriod,
  parsePeriodFromUrl,
  normalizeTransactionPeriod,
  resolveTransactionPeriodRange,
  resolveTransactionPeriodRangeForTotals,
  isCustomPeriodIncomplete,
  isPeriodFilterActive,
  resolvePeriodFromRequest,
  getCustomPeriodValidation,
  getDefaultCustomPeriodRange,
  getTransactionPeriodOptions,
} from './transactionPeriodRange'

dayjs.extend(utc)
dayjs.extend(timezone)

describe('transactionPeriodRange', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-15T12:00:00+02:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('isValidTransactionPeriod akzeptiert nur all, current, custom', () => {
    expect(isValidTransactionPeriod('all')).toBe(true)
    expect(isValidTransactionPeriod('current')).toBe(true)
    expect(isValidTransactionPeriod('custom')).toBe(true)
    expect(isValidTransactionPeriod('3months')).toBe(false)
  })

  it('parsePeriodFromUrl mappt filterSalaryMonth=1 auf current', () => {
    const params = new URLSearchParams('filterSalaryMonth=1')
    expect(parsePeriodFromUrl(params)).toEqual({
      period: 'current',
      startDate: '',
      endDate: '',
    })
  })

  it('Legacy-Rolling-Presets werden auf all abgebildet', () => {
    expect(parsePeriodFromUrl(new URLSearchParams('period=3months')).period).toBe(
      'all'
    )
    expect(normalizeTransactionPeriod('1year')).toBe('all')
  })

  it('all liefert null für Listenfilter', () => {
    expect(
      resolveTransactionPeriodRange({
        period: 'all',
        salaryDay: 15,
        isSimpleAccount: false,
      })
    ).toBeNull()
  })

  it('current nutzt Gehaltsmonat für Planungskonten', () => {
    const range = resolveTransactionPeriodRange({
      period: 'current',
      salaryDay: 15,
      isSimpleAccount: false,
    })
    expect(range).not.toBeNull()
    expect(dayjs(range!.gte).tz('Europe/Berlin').date()).toBe(15)
    expect(range!.label).toMatch(/\d{2}\.\d{2}\.\d{4}/)
  })

  it('current nutzt Kalendermonat für einfache Konten', () => {
    const range = resolveTransactionPeriodRange({
      period: 'current',
      salaryDay: 15,
      isSimpleAccount: true,
    })
    expect(range).not.toBeNull()
    expect(dayjs(range!.gte).tz('Europe/Berlin').date()).toBe(1)
    expect(range!.label).toMatch(/Juni 2025/)
  })

  it('custom mit gültigen Daten', () => {
    const range = resolveTransactionPeriodRange({
      period: 'custom',
      startDate: '2025-01-01',
      endDate: '2025-01-31',
      salaryDay: 15,
      isSimpleAccount: false,
    })
    expect(range!.label).toBe('01.01.2025 – 31.01.2025')
  })

  it('custom ohne Daten liefert null', () => {
    expect(
      resolveTransactionPeriodRange({
        period: 'custom',
        startDate: '',
        endDate: '',
        salaryDay: 15,
        isSimpleAccount: false,
      })
    ).toBeNull()
  })

  it('resolveTransactionPeriodRangeForTotals nutzt current bei all', () => {
    const range = resolveTransactionPeriodRangeForTotals({
      period: 'all',
      salaryDay: 15,
      isSimpleAccount: false,
    })
    expect(range.label).toMatch(/\d{2}\.\d{2}\.\d{4}/)
  })

  it('getCustomPeriodValidation erkennt ungültige Reihenfolge', () => {
    expect(getCustomPeriodValidation('2025-02-01', '2025-01-01').status).toBe('invalid')
    expect(getCustomPeriodValidation('2025-01-01', '2025-01-31').status).toBe('complete')
  })

  it('getDefaultCustomPeriodRange liefert Monatsanfang bis heute', () => {
    const range = getDefaultCustomPeriodRange()
    expect(range.startDate).toMatch(/^\d{4}-\d{2}-01$/)
    expect(range.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('getTransactionPeriodOptions liefert drei Einträge', () => {
    expect(getTransactionPeriodOptions(false)).toHaveLength(3)
    expect(getTransactionPeriodOptions(false)[1].label).toBe('Nur Gehaltsmonat')
    expect(getTransactionPeriodOptions(true)[1].label).toBe('Nur Kalendermonat')
  })

  it('isPeriodFilterActive', () => {
    expect(isPeriodFilterActive('all')).toBe(false)
    expect(isPeriodFilterActive('current')).toBe(true)
  })

  it('isCustomPeriodIncomplete', () => {
    expect(isCustomPeriodIncomplete('custom', '', '2025-01-01')).toBe(true)
    expect(isCustomPeriodIncomplete('custom', '2025-01-01', '2025-01-31')).toBe(false)
  })

  it('resolvePeriodFromRequest unterstützt Legacy filterSalaryMonth', () => {
    expect(
      resolvePeriodFromRequest(new URLSearchParams('filterSalaryMonth=true'))
    ).toEqual({ period: 'current', startDate: null, endDate: null })
  })
})
