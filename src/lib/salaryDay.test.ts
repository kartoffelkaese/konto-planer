import { describe, it, expect } from 'vitest'
import { resolveSalaryDay } from './salaryDay'

describe('resolveSalaryDay', () => {
  const userDay = 15

  it('nutzt user.salaryDay wenn kein Parameter', () => {
    expect(resolveSalaryDay(null, userDay)).toBe(15)
    expect(resolveSalaryDay(undefined, userDay)).toBe(15)
    expect(resolveSalaryDay('', userDay)).toBe(15)
  })

  it('akzeptiert gültigen Query-Parameter', () => {
    expect(resolveSalaryDay('23', userDay)).toBe(23)
    expect(resolveSalaryDay('1', userDay)).toBe(1)
    expect(resolveSalaryDay('31', userDay)).toBe(31)
  })

  it('fällt bei ungültigem Parameter auf user.salaryDay zurück', () => {
    expect(resolveSalaryDay('0', userDay)).toBe(15)
    expect(resolveSalaryDay('32', userDay)).toBe(15)
    expect(resolveSalaryDay('abc', userDay)).toBe(15)
    expect(resolveSalaryDay('15.5', userDay)).toBe(15)
  })
})
