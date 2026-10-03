/** Nur serverseitig: bcrypt gehört nicht ins Client-Bundle (validatePassword wird auch im Browser genutzt) */
import bcrypt from 'bcryptjs'

/** Kostenfaktor für neue Passwort-Hashes; ältere Hashes werden beim nächsten Login angehoben */
export const BCRYPT_COST = 12

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST)
}

/** true, wenn ein gespeicherter Hash mit kleinerem Kostenfaktor erzeugt wurde */
export function needsRehash(passwordHash: string): boolean {
  try {
    return bcrypt.getRounds(passwordHash) < BCRYPT_COST
  } catch {
    return false
  }
}
