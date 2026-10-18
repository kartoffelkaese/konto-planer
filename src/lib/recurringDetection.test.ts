import { describe, expect, it } from 'vitest'
import { cleanBankPartnerName, detectRecurringPayments, type DetectionRow } from './recurringDetection'

/** Buchung um 12 Uhr Ortszeit – wie der CSV-Import sie liefert */
const day = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}

const row = (date: string, amount: number, merchantRaw: string, description = ''): DetectionRow => ({
  date: day(date),
  amount,
  merchantRaw,
  description,
})

/** n Buchungen im Monatsabstand ab Startmonat, am gleichen Tag */
function monthly(start: string, n: number, amount: number | ((i: number) => number), name: string) {
  const [y, m, d] = start.split('-').map(Number)
  return Array.from({ length: n }, (_, i) => {
    const date = new Date(y, m - 1 + i, d, 12)
    return {
      date,
      amount: typeof amount === 'function' ? amount(i) : amount,
      merchantRaw: name,
      description: '',
    }
  })
}

const PERIOD_END = day('2026-09-30')
const detect = (rows: DetectionRow[], options = {}) =>
  detectRecurringPayments(rows, { periodEnd: PERIOD_END, ...options })

describe('detectRecurringPayments', () => {
  it('erkennt eine feste monatliche Ausgabe', () => {
    const { suggestions } = detect(monthly('2025-10-03', 12, -12.99, 'Netflix International B.V.'))
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]).toMatchObject({
      direction: 'expense',
      name: 'Netflix International B.V.',
      amount: -12.99,
      variable: false,
      interval: 'monthly',
      date: '2026-09-03',
      occurrences: 12,
      confidence: 'high',
      status: 'active',
      preselected: true,
    })
  })

  it('verkraftet eine ausgelassene Monatsbuchung und Verschiebungen um das Wochenende', () => {
    const rows = monthly('2025-10-01', 12, -45, 'Stadtwerke').filter((_, i) => i !== 5)
    rows[2].date = day('2025-12-03')
    const { suggestions } = detect(rows)
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]).toMatchObject({ interval: 'monthly', status: 'active', occurrences: 11 })
  })

  it('schwankende Beträge: Median als Vorschlag, Spanne dabei', () => {
    const amounts = [-21.5, -24, -19.9, -27.3, -22.1, -25, -20.4, -23.8, -26.1, -21, -24.4, -22.9]
    const { suggestions } = detect(monthly('2025-10-15', 12, (i) => amounts[i], 'Telefonica Germany'))
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0].variable).toBe(true)
    expect(suggestions[0].amount).toBeCloseTo(-23.35, 2)
    expect(suggestions[0]).toMatchObject({ amountMin: 19.9, amountMax: 27.3, interval: 'monthly' })
  })

  it('Preisänderung: aktueller Betrag statt Mittelwert', () => {
    const { suggestions } = detect(monthly('2025-10-17', 12, (i) => (i < 5 ? -8.99 : -10.99), 'Vodafone GmbH'))
    expect(suggestions[0]).toMatchObject({
      amount: -10.99,
      variable: false,
      amountChanged: true,
      previousAmount: 8.99,
      confidence: 'high',
    })
  })

  it('erkennt vierteljährlich, halbjährlich und jährlich', () => {
    const rows = [
      ...['2025-10-10', '2026-01-10', '2026-04-10', '2026-07-10'].map((d) => row(d, -60, 'Rundfunk ARD ZDF')),
      ...['2025-11-20', '2026-05-20'].map((d) => row(d, -180, 'HUK-Coburg')),
      ...['2025-09-01', '2026-09-01'].map((d) => row(d, -89, 'ADAC')),
    ]
    const byName = Object.fromEntries(detect(rows).suggestions.map((s) => [s.name, s]))
    expect(byName['Rundfunk ARD ZDF'].interval).toBe('quarterly')
    expect(byName['HUK-Coburg'].interval).toBe('semiannual')
    expect(byName['ADAC'].interval).toBe('yearly')
    // Nur zwei Beobachtungen: höchstens „mittel“
    expect(byName['ADAC'].confidence).toBe('medium')
  })

  it('beendete Verträge: erkannt, aber nicht vorausgewählt', () => {
    const { suggestions } = detect(monthly('2025-10-05', 6, -9.99, 'Spotify AB'))
    expect(suggestions[0]).toMatchObject({ status: 'ended', preselected: false })
  })

  it('unregelmäßige Einkäufe ergeben keinen Vorschlag', () => {
    const dates = ['2025-10-02', '2025-10-09', '2025-10-11', '2025-10-24', '2025-11-03', '2025-11-05',
      '2025-11-19', '2025-12-01', '2025-12-02', '2025-12-23', '2026-01-08', '2026-01-30']
    const rows = dates.map((d, i) => row(d, -(15 + ((i * 37) % 80)), 'REWE Markt GmbH'))
    expect(detect(rows).suggestions).toHaveLength(0)
  })

  it('trennt mehrere Abos über denselben Zahlungsdienst nach Betrag', () => {
    const rows = [
      ...monthly('2025-10-07', 12, -4.99, 'PayPal Europe S.a.r.l.'),
      ...monthly('2025-10-21', 12, -17.99, 'PayPal Europe S.a.r.l.'),
    ]
    const { suggestions } = detect(rows)
    expect(suggestions.map((s) => s.amount).sort()).toEqual([-17.99, -4.99])
  })

  it('Gehalt: Einnahme vorn, Gehaltstag als Vorschlag', () => {
    const rows = [
      ...monthly('2025-10-28', 12, 3200, 'Arbeitgeber GmbH'),
      ...monthly('2025-10-01', 12, -950, 'Vermieter'),
    ]
    rows[3].date = day('2026-01-27')
    const result = detect(rows, { salaryDay: 1 })
    expect(result.suggestions[0]).toMatchObject({ direction: 'income', name: 'Arbeitgeber GmbH' })
    expect(result.salaryDaySuggestion).toEqual({ day: 28, name: 'Arbeitgeber GmbH' })
    expect(detect(rows, { salaryDay: 28 }).salaryDaySuggestion).toBeNull()
  })

  it('vorhandene Vorlage: „bereits angelegt“, nicht vorausgewählt', () => {
    const { suggestions } = detect(monthly('2025-10-01', 12, -950, 'Vermieter'), {
      templates: [{ id: 't1', amount: -950, merchantId: null, merchant: 'Vermieter' }],
    })
    expect(suggestions[0]).toMatchObject({ status: 'existing', existingTemplateId: 't1', preselected: false })
  })

  it('ordnet bekannte Händler zu und übernimmt deren Kategorie', () => {
    const { suggestions } = detect(monthly('2025-10-03', 12, -12.99, 'NETFLIX.COM 866-579-7172'), {
      merchants: [{ id: 'm1', name: 'Netflix', categoryIds: ['c-abo'] }],
    })
    expect(suggestions[0]).toMatchObject({ merchantId: 'm1', name: 'Netflix', categoryId: 'c-abo' })
  })

  it('zwei Buchungen im Monat sind kein monatliches Muster', () => {
    const rows = [...monthly('2025-10-01', 12, -30, 'Tankstelle'), ...monthly('2025-10-16', 12, -30, 'Tankstelle')]
    expect(detect(rows).suggestions).toHaveLength(0)
  })
})

describe('cleanBankPartnerName', () => {
  it.each([
    ['THEGRINDNEWS.DE/HANNOVER', 'thegrindnews.de'],
    ['Lidl.sagt.Danke/Nuernberg', 'Lidl sagt Danke'],
    ['CURSOR..AI.POWERED.IDE/CURSOR.COM', 'Cursor AI Powered Ide'],
    ['ADAC', 'ADAC'],
    ['Vodafone GmbH SIMon mobile DE-16285 Schwedt', 'Vodafone GmbH SIMon mobile'],
    ['Stadtwerke Musterstadt 12345 Musterstadt', 'Stadtwerke Musterstadt'],
    ['SARAH BAYER UND MARTIN URBAN', 'Sarah Bayer und Martin Urban'],
    ['TIM PRITLOVE', 'Tim Pritlove'],
    ['HAUSEINS UG', 'Hauseins UG'],
    ['NETZPOLITIK.ORG E. V.', 'netzpolitik.org E. V.'],
    ['TANZSTUDIO SCHLEGL GMBH + CO.', 'Tanzstudio Schlegl GmbH + Co.'],
    ['Generali Deutschland Lebensversicherung AG', 'Generali Deutschland Lebensversicherung AG'],
    ['Netflix International B.V.', 'Netflix International B.V.'],
    ['DKB AG', 'DKB AG'],
  ])('%s → %s', (raw, expected) => {
    expect(cleanBankPartnerName(raw)).toBe(expected)
  })
})
