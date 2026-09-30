import { describe, it, expect, vi } from 'vitest'
import { NextResponse } from 'next/server'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ prisma: {} }))

import {
  validateSalaryDay,
  validateAccountName,
  validateBankId,
  isErrorResponse,
  readJsonBody,
  validateAmount,
  validateDateInput,
  MAX_ABS_AMOUNT,
} from './api-auth'

describe('validateSalaryDay', () => {
  it('akzeptiert gültige Tage', () => {
    expect(validateSalaryDay(1)).toBe(1)
    expect(validateSalaryDay(31)).toBe(31)
    expect(validateSalaryDay('15')).toBe(15)
  })

  it('lehnt ungültige Werte ab', () => {
    const result = validateSalaryDay(0)
    expect(isErrorResponse(result)).toBe(true)
    if (result instanceof NextResponse) {
      expect(result.status).toBe(400)
    }
  })
})

describe('validateAccountName', () => {
  it('trimmt und akzeptiert Namen', () => {
    expect(validateAccountName('  Giro  ')).toBe('Giro')
  })

  it('lehnt leeren Namen ab', () => {
    expect(isErrorResponse(validateAccountName('   '))).toBe(true)
  })
})

describe('validateBankId', () => {
  it('lässt undefined unverändert', () => {
    expect(validateBankId(undefined)).toBeUndefined()
  })

  it('akzeptiert null und leeren String als keine Zuordnung', () => {
    expect(validateBankId(null)).toBeNull()
    expect(validateBankId('')).toBeNull()
  })

  it('akzeptiert bekannte Bank-Slugs', () => {
    expect(validateBankId('ing')).toBe('ing')
    expect(validateBankId(' trade-republic ')).toBe('trade-republic')
  })

  it('lehnt unbekannte Banken ab', () => {
    expect(isErrorResponse(validateBankId('paypal'))).toBe(true)
  })

  it('lehnt ungültige Typen ab', () => {
    expect(isErrorResponse(validateBankId(42))).toBe(true)
  })
})

function jsonRequest(body: string) {
  return new Request('http://localhost/api/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
}

describe('readJsonBody', () => {
  it('liefert gültige Objekte unverändert', async () => {
    expect(await readJsonBody(jsonRequest('{"a":1}'))).toEqual({ a: 1 })
  })

  it('lehnt ungültiges JSON mit 400 ab', async () => {
    const result = await readJsonBody(jsonRequest('{kaputt'))
    expect(isErrorResponse(result)).toBe(true)
    if (result instanceof NextResponse) {
      expect(result.status).toBe(400)
      expect(await result.json()).toEqual({ error: 'Ungültige Anfrage' })
    }
  })

  it('lehnt Nicht-Objekte ab', async () => {
    for (const body of ['null', '[1,2]', '"text"', '42']) {
      expect(isErrorResponse(await readJsonBody(jsonRequest(body)))).toBe(true)
    }
  })
})

describe('validateAmount', () => {
  it('akzeptiert Zahlen und numerische Strings', () => {
    expect(validateAmount(12.5)).toBe(12.5)
    expect(validateAmount(-3)).toBe(-3)
    expect(validateAmount(0)).toBe(0)
    expect(validateAmount('42.10')).toBe(42.1)
    expect(validateAmount(MAX_ABS_AMOUNT)).toBe(MAX_ABS_AMOUNT)
  })

  it('lässt undefined durch (optional bei PATCH)', () => {
    expect(validateAmount(undefined)).toBeUndefined()
  })

  it('lehnt ungültige Beträge mit 400 ab', () => {
    for (const value of [NaN, Infinity, 'abc', '', '12,5', null, {}, MAX_ABS_AMOUNT + 1]) {
      const result = validateAmount(value)
      expect(isErrorResponse(result)).toBe(true)
      if (result instanceof NextResponse) expect(result.status).toBe(400)
    }
  })
})

describe('validateDateInput', () => {
  it('akzeptiert ISO-Strings, Zeitstempel und Date', () => {
    expect(validateDateInput('2026-09-28T00:00:00.000Z')).toEqual(
      new Date('2026-09-28T00:00:00.000Z')
    )
    expect(validateDateInput(0)).toEqual(new Date(0))
    const d = new Date()
    expect(validateDateInput(d)).toEqual(d)
  })

  it('lässt undefined durch', () => {
    expect(validateDateInput(undefined)).toBeUndefined()
  })

  it('lehnt ungültige Daten mit 400 ab', () => {
    for (const value of ['kein Datum', null, {}, true]) {
      const result = validateDateInput(value)
      expect(isErrorResponse(result)).toBe(true)
      if (result instanceof NextResponse) expect(result.status).toBe(400)
    }
  })
})
