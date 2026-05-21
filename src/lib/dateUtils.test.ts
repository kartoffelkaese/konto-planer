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
  getNextRecurringDueDate,
  getNextRecurringDueDateAfter,
  getRecurringDueDatesInRange,
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
    expect(dayjs(next).tz('Europe/Berlin').month()).toBe(1)
    expect(dayjs(next).tz('Europe/Berlin').date()).toBe(15)
  })
})

describe('getNextRecurringDueDate (Anker)', () => {
  const anchor = '2025-01-01'

  it('Anlage 01.01., Referenz 05.01. → nächste Fälligkeit 01.02.', () => {
    const next = getNextRecurringDueDate(anchor, 'monthly', '2025-01-05')
    expect(dayjs(next).tz('Europe/Berlin').format('YYYY-MM-DD')).toBe('2025-02-01')
  })

  it('Anlage 01.01., Referenz 01.01. → 01.01.', () => {
    const next = getNextRecurringDueDate(anchor, 'monthly', '2025-01-01')
    expect(dayjs(next).tz('Europe/Berlin').format('YYYY-MM-DD')).toBe('2025-01-01')
  })

  it('Anlage 01.01., Referenz nach Februar → 01.03.', () => {
    const next = getNextRecurringDueDate(anchor, 'monthly', '2025-02-15')
    expect(dayjs(next).tz('Europe/Berlin').format('YYYY-MM-DD')).toBe('2025-03-01')
  })

  it('vierteljährlich: Anker 15.03., Referenz 20.06. → 15.09.', () => {
    const next = getNextRecurringDueDate('2025-03-15', 'quarterly', '2025-06-20')
    expect(dayjs(next).tz('Europe/Berlin').format('YYYY-MM-DD')).toBe('2025-09-15')
  })
})

describe('getNextRecurringDueDateAfter', () => {
  it('nach Instanz 01.02. → 01.03.', () => {
    const next = getNextRecurringDueDateAfter(
      '2025-01-01',
      'monthly',
      '2025-02-01'
    )
    expect(dayjs(next).tz('Europe/Berlin').format('YYYY-MM-DD')).toBe('2025-03-01')
  })
})

describe('getRecurringDueDatesInRange', () => {
  it('enthält 01.01. im Januar-Zeitraum', () => {
    const dates = getRecurringDueDatesInRange(
      '2025-01-01',
      'monthly',
      '2025-01-01',
      '2025-01-31'
    )
    expect(dates.length).toBe(1)
    expect(dayjs(dates[0]).tz('Europe/Berlin').format('YYYY-MM-DD')).toBe('2025-01-01')
  })

  it('enthält 01.01. und 01.02. über zwei Monate', () => {
    const dates = getRecurringDueDatesInRange(
      '2025-01-01',
      'monthly',
      '2025-01-01',
      '2025-02-28'
    )
    expect(dates.map((d) => dayjs(d).tz('Europe/Berlin').format('YYYY-MM-DD'))).toEqual([
      '2025-01-01',
      '2025-02-01',
    ])
  })
})

describe('isTransactionDueInSalaryMonth', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-10T12:00:00+01:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('nicht wiederkehrend → false', () => {
    expect(
      isTransactionDueInSalaryMonth(
        { date: new Date(), isRecurring: false },
        1
      )
    ).toBe(false)
  })

  it('Anker 01.01. fällig im Gehaltsmonat ab 01.01. (ohne Abhängigkeit von lastConfirmedDate)', () => {
    expect(
      isTransactionDueInSalaryMonth(
        {
          date: '2025-01-01',
          isRecurring: true,
          recurringInterval: 'monthly',
          lastConfirmedDate: '2025-01-05',
        },
        1
      )
    ).toBe(true)
  })

  it('pausiert → nicht fällig im Gehaltsmonat', () => {
    expect(
      isTransactionDueInSalaryMonth(
        {
          date: '2025-01-01',
          isRecurring: true,
          isRecurringPaused: true,
          recurringInterval: 'monthly',
        },
        1
      )
    ).toBe(false)
  })

  it('wiederkehrend ohne recurringInterval → true', () => {
    expect(
      isTransactionDueInSalaryMonth(
        {
          date: new Date(),
          isRecurring: true,
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
