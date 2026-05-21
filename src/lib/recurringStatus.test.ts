import { describe, it, expect } from 'vitest'
import { getRecurringSalaryMonthStatus } from './recurringStatus'
import type { RecurringWithStatus } from './recurringStatus'

const base = {
  id: '1',
  amount: -10,
  merchant: 'Test',
  date: new Date().toISOString(),
  isRecurring: true,
  isConfirmed: true,
} as RecurringWithStatus

describe('getRecurringSalaryMonthStatus', () => {
  it('zeigt Pausiert wenn isRecurringPaused', () => {
    const status = getRecurringSalaryMonthStatus({
      ...base,
      isRecurringPaused: true,
      dueInSalaryMonth: true,
    })
    expect(status.label).toBe('Pausiert')
  })

  it('zeigt ausstehend wenn unbestätigte Instanz existiert', () => {
    const status = getRecurringSalaryMonthStatus({
      ...base,
      hasUnconfirmedInstanceInSalaryMonth: true,
    })
    expect(status.label).toContain('Ausstehend')
  })

  it('zeigt fällig wenn due aber keine Instanz', () => {
    const status = getRecurringSalaryMonthStatus({
      ...base,
      dueInSalaryMonth: true,
      hasInstanceInSalaryMonth: false,
    })
    expect(status.label).toContain('Fällig')
  })
})
