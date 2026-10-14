import { describe, expect, it } from 'vitest'
import {
  TRIAL_DAYS,
  daysLeft,
  downgradedAt,
  getEffectivePlan,
  getEntitlements,
  getStoredPlan,
  highestPlan,
  keptAccountChangeAllowedAt,
  keptAccountChoiceRequired,
  plansEnabled,
  trialEndsAt,
  writableOwnedAccountIds,
} from './plans'

const NOW = new Date('2026-10-05T12:00:00Z')
const TOMORROW = new Date('2026-10-06T12:00:00Z')
const YESTERDAY = new Date('2026-10-04T12:00:00Z')

describe('plansEnabled', () => {
  it('gilt nur bei ausdrücklichem „true“', () => {
    expect(plansEnabled('true')).toBe(true)
    expect(plansEnabled('false')).toBe(false)
    expect(plansEnabled(undefined)).toBe(false)
    expect(plansEnabled('1')).toBe(false)
  })
})

describe('getStoredPlan', () => {
  it('liefert das gespeicherte Level, solange es nicht abgelaufen ist', () => {
    expect(getStoredPlan({ plan: 'BASIC' }, NOW)).toBe('BASIC')
    expect(getStoredPlan({ plan: 'FULL', planExpiresAt: null }, NOW)).toBe('FULL')
    expect(getStoredPlan({ plan: 'FULL', planExpiresAt: TOMORROW }, NOW)).toBe('FULL')
  })

  it('fällt nach Ablauf auf „Start“ zurück', () => {
    expect(getStoredPlan({ plan: 'FULL', planExpiresAt: YESTERDAY }, NOW)).toBe('BASIC')
    expect(getStoredPlan({ plan: 'FULL', planExpiresAt: NOW }, NOW)).toBe('BASIC')
    expect(getStoredPlan({ plan: 'FULL', planExpiresAt: YESTERDAY.toISOString() }, NOW)).toBe('BASIC')
  })
})

describe('getEffectivePlan', () => {
  it('gibt ohne aktive Level allen „Komplett“', () => {
    expect(getEffectivePlan({ plan: 'BASIC' }, NOW, false)).toBe('FULL')
    expect(getEffectivePlan({ plan: 'FULL', planExpiresAt: YESTERDAY }, NOW, false)).toBe('FULL')
  })

  it('wertet mit aktiven Leveln das gespeicherte Level aus', () => {
    expect(getEffectivePlan({ plan: 'BASIC' }, NOW, true)).toBe('BASIC')
    expect(getEffectivePlan({ plan: 'FULL', planExpiresAt: TOMORROW }, NOW, true)).toBe('FULL')
    expect(getEffectivePlan({ plan: 'FULL', planExpiresAt: YESTERDAY }, NOW, true)).toBe('BASIC')
  })
})

describe('getEntitlements', () => {
  it('„Start“: ein Konto, keine Zusatzfunktionen', () => {
    expect(getEntitlements('BASIC')).toEqual({
      maxOwnedAccounts: 1,
      shareAccounts: false,
      statistics: false,
      csvImport: false,
      splitOwnLists: false,
    })
  })

  it('„Komplett“: alles, unbegrenzt viele Konten', () => {
    expect(getEntitlements('FULL')).toEqual({
      maxOwnedAccounts: null,
      shareAccounts: true,
      statistics: true,
      csvImport: true,
      splitOwnLists: true,
    })
  })
})

describe('highestPlan', () => {
  it('nimmt „Komplett“, sobald es einmal vorkommt', () => {
    expect(highestPlan(['BASIC', 'FULL'])).toBe('FULL')
    expect(highestPlan(['BASIC'])).toBe('BASIC')
    expect(highestPlan([])).toBe('BASIC')
  })
})

describe('Testphase', () => {
  it('endet nach 14 Tagen', () => {
    expect(TRIAL_DAYS).toBe(14)
    expect(trialEndsAt(NOW).toISOString()).toBe('2026-10-19T12:00:00.000Z')
  })

  it('zählt angebrochene Tage als ganzen Tag', () => {
    expect(daysLeft(trialEndsAt(NOW), NOW)).toBe(14)
    expect(daysLeft(new Date('2026-10-05T13:00:00Z'), NOW)).toBe(1)
    expect(daysLeft(YESTERDAY, NOW)).toBeNull()
    expect(daysLeft(null, NOW)).toBeNull()
  })
})

describe('writableOwnedAccountIds', () => {
  it('ohne Grenze oder innerhalb der Grenze: alle Konten', () => {
    expect(writableOwnedAccountIds(['a', 'b', 'c'], null, null)).toBeNull()
    expect(writableOwnedAccountIds(['a'], null, 1)).toBeNull()
  })

  it('über der Grenze: das älteste bleibt, sofern nichts gewählt ist', () => {
    expect(writableOwnedAccountIds(['a', 'b', 'c'], null, 1)).toEqual(['a'])
  })

  it('das gewählte Konto hat Vorrang; eine ungültige Auswahl wird ignoriert', () => {
    expect(writableOwnedAccountIds(['a', 'b', 'c'], 'c', 1)).toEqual(['c'])
    expect(writableOwnedAccountIds(['a', 'b', 'c'], 'c', 2)).toEqual(['c', 'a'])
    expect(writableOwnedAccountIds(['a', 'b'], 'fremd', 1)).toEqual(['a'])
  })
})

describe('keptAccountChangeAllowedAt', () => {
  it('ohne bisherigen Wechsel und nach Ablauf der Frist: sofort', () => {
    expect(keptAccountChangeAllowedAt(null, NOW)).toBeNull()
    expect(keptAccountChangeAllowedAt(new Date('2026-08-01T12:00:00Z'), NOW)).toBeNull()
  })

  it('innerhalb von 60 Tagen: erst ab dem Ende der Frist', () => {
    expect(keptAccountChangeAllowedAt(new Date('2026-10-01T12:00:00Z'), NOW)).toEqual(
      new Date('2026-11-30T12:00:00Z')
    )
  })
})

describe('downgradedAt', () => {
  it('abgelaufenes „Komplett“: das Ablaufdatum', () => {
    expect(downgradedAt({ plan: 'FULL', planExpiresAt: YESTERDAY }, null, NOW)).toEqual(YESTERDAY)
  })

  it('„Start“ von Hand: der letzte Wechsel im Verlauf; laufendes „Komplett“: keiner', () => {
    expect(downgradedAt({ plan: 'BASIC' }, YESTERDAY, NOW)).toEqual(YESTERDAY)
    expect(downgradedAt({ plan: 'BASIC' }, null, NOW)).toBeNull()
    expect(downgradedAt({ plan: 'FULL', planExpiresAt: TOMORROW }, null, NOW)).toBeNull()
  })
})

describe('keptAccountChoiceRequired', () => {
  const base = { plan: 'BASIC' as const, ownedAccounts: 2, keptAccountChangedAt: null, downgradedAt: YESTERDAY }

  it('nur auf „Start“ mit mehr Konten als erlaubt', () => {
    expect(keptAccountChoiceRequired(base)).toBe(true)
    expect(keptAccountChoiceRequired({ ...base, plan: 'FULL' })).toBe(false)
    expect(keptAccountChoiceRequired({ ...base, ownedAccounts: 1 })).toBe(false)
  })

  it('erledigt, sobald nach der Herabstufung gewählt wurde', () => {
    expect(keptAccountChoiceRequired({ ...base, keptAccountChangedAt: NOW })).toBe(false)
    expect(keptAccountChoiceRequired({ ...base, keptAccountChangedAt: new Date('2026-09-01') })).toBe(true)
    expect(keptAccountChoiceRequired({ ...base, keptAccountChangedAt: NOW, downgradedAt: null })).toBe(false)
  })
})
