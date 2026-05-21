import { describe, it, expect } from 'vitest'
import { validateBackupPayload } from './backup-validation'

describe('validateBackupPayload', () => {
  it('lehnt fehlende Felder ab', () => {
    expect(validateBackupPayload({})).not.toBeNull()
    expect(validateBackupPayload(null)).not.toBeNull()
  })

  it('akzeptiert minimales gültiges Backup', () => {
    expect(
      validateBackupPayload({
        version: 1,
        categories: [],
        merchants: [],
        transactions: [],
      })
    ).toBeNull()
  })
})
