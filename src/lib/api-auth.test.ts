import { describe, it, expect, vi } from 'vitest'
import { NextResponse } from 'next/server'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ prisma: {} }))

import {
  validateSalaryDay,
  validateAccountName,
  isErrorResponse,
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
