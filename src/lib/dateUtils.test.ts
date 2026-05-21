import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import {
  getSalaryMonthRange,
  getSalaryMonthPeriodInfo,
  isTransactionDueInSalaryMonth,
  isTransactionPending,
  getNextDueDate,
} from './dateUtils'
import type { Transaction } from '@/types'

dayjs.extend(utc)
dayjs.extend(timezone)

describe('getSalaryMonthRange', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-05-15T12:00:00+02:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('vor Gehaltstag: Gehaltsmonat beginnt im Vormonat', () => {
    const { startDate, endDate } = getSalaryMonthRange(23)
    expect(dayjs(startDate).tz('Europe/Berlin').date()).toBe(23)
    expect(dayjs(startDate).tz('Europe/Berlin').month()).toBe(3)
    expect(dayjs(endDate).tz('Europe/Berlin').date()).toBe(22)
    expect(dayjs(endDate).tz('Europe/Berlin').month()).toBe(4)
  })

  it('ab Gehaltstag: Gehaltsmonat beginnt im aktuellen Monat', () => {
    vi.setSystemTime(new Date('2025-05-25T12:00:00+02:00'))
    const { startDate, endDate } = getSalaryMonthRange(23)
    expect(dayjs(startDate).tz('Europe/Berlin').date()).toBe(23)
    expect(dayjs(startDate).tz('Europe/Berlin').month()).toBe(4)
    expect(dayjs(endDate).tz('Europe/Berlin').date()).toBe(22)
    expect(dayjs(endDate).tz('Europe/Berlin').month()).toBe(5)
  })
})

describe('getSalaryMonthPeriodInfo', () => {
  it('liefert rangeLabel mit formatierten Daten', () => {
    const info = getSalaryMonthPeriodInfo(1)
    expect(info.rangeLabel).toMatch(/\d{2}\.\d{2}\.\d{4} – \d{2}\.\d{2}\.\d{4}/)
    expect(info.startDate).toBeInstanceOf(Date)
    expect(info.endDate).toBeInstanceOf(Date)
  })
})

describe('getNextDueDate', () => {
  it('addiert monatlich', () => {
    const next = getNextDueDate('2025-01-15', 'monthly')
    expect(dayjs(next).month()).toBe(1)
    expect(dayjs(next).date()).toBe(15)
  })
})

describe('isTransactionDueInSalaryMonth', () => {
  it('nicht wiederkehrend → false', () => {
    expect(
      isTransactionDueInSalaryMonth(
        { date: new Date(), isRecurring: false },
        23
      )
    ).toBe(false)
  })

  it('wiederkehrend ohne lastConfirmedDate → true', () => {
    expect(
      isTransactionDueInSalaryMonth(
        {
          date: new Date(),
          isRecurring: true,
          recurringInterval: 'monthly',
        },
        23
      )
    ).toBe(true)
  })
})

describe('isTransactionPending', () => {
  it('nutzt übergebenen salaryDay', () => {
    const tx = {
      isRecurring: true,
      isConfirmed: false,
      date: new Date(),
      recurringInterval: 'monthly',
    } as Transaction

    expect(isTransactionPending(tx, 23)).toBe(true)
    expect(isTransactionPending({ ...tx, isConfirmed: true }, 23)).toBe(false)
  })
})
