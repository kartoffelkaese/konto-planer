import { describe, it, expect } from 'vitest'
import { normalizeEmail } from './accounts'

describe('normalizeEmail', () => {
  it('trimmt und wandelt in Kleinbuchstaben um', () => {
    expect(normalizeEmail('  User@Example.COM  ')).toBe('user@example.com')
  })
})
