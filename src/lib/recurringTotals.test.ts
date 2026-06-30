import { describe, it, expect } from 'vitest'
import { computeRecurringTotals } from './recurringTotals'

describe('computeRecurringTotals', () => {
  it('summiert monatliche Ausgaben', () => {
    const totals = computeRecurringTotals([
      { amount: -50, recurringInterval: 'monthly' },
      { amount: -30, recurringInterval: 'monthly' },
    ])
    expect(totals.monthly.total).toBe(-80)
    expect(totals.totalMonthly).toBe(-80)
  })

  it('rechnet vierteljährliche und jährliche auf Monatsbasis um', () => {
    const totals = computeRecurringTotals([
      { amount: -90, recurringInterval: 'quarterly' },
      { amount: -120, recurringInterval: 'yearly' },
    ])
    expect(totals.quarterly.perMonth).toBe(-30)
    expect(totals.yearly.perMonth).toBe(-10)
    expect(totals.totalMonthly).toBe(-40)
  })

  it('rechnet halbjährliche auf Monatsbasis um', () => {
    const totals = computeRecurringTotals([
      { amount: -120, recurringInterval: 'semiannual' },
    ])
    expect(totals.semiannual.total).toBe(-120)
    expect(totals.semiannual.perMonth).toBe(-20)
    expect(totals.totalMonthly).toBe(-20)
  })

  it('ignoriert pausierte Zahlungen', () => {
    const totals = computeRecurringTotals([
      { amount: -100, recurringInterval: 'monthly' },
      { amount: -200, recurringInterval: 'monthly', isRecurringPaused: true },
    ])
    expect(totals.monthly.total).toBe(-100)
    expect(totals.totalMonthly).toBe(-100)
  })

  it('reflektiert geänderte Vorlagenbeträge sofort', () => {
    const before = computeRecurringTotals([
      { amount: -50, recurringInterval: 'monthly' },
    ])
    const after = computeRecurringTotals([
      { amount: -75, recurringInterval: 'monthly' },
    ])
    expect(before.totalMonthly).toBe(-50)
    expect(after.totalMonthly).toBe(-75)
  })

  it('mischt Einnahmen und Ausgaben algebraisch', () => {
    const totals = computeRecurringTotals([
      { amount: 2000, recurringInterval: 'monthly' },
      { amount: -800, recurringInterval: 'monthly' },
    ])
    expect(totals.totalMonthly).toBe(1200)
  })
})
