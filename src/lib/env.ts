/**
 * Pflicht-Umgebungsvariablen für Produktion (öffentliches Hosting).
 */
export function assertProductionEnv(): void {
  if (process.env.NODE_ENV !== 'production') return

  const missing: string[] = []
  if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
    missing.push('AUTH_SECRET (oder NEXTAUTH_SECRET)')
  }
  if (!process.env.DATABASE_URL) {
    missing.push('DATABASE_URL')
  }
  if (!process.env.AUTH_URL && !process.env.NEXTAUTH_URL) {
    missing.push('AUTH_URL (kanonische öffentliche URL, z. B. https://konto-planer.de)')
  }

  if (missing.length > 0) {
    throw new Error(
      `Fehlende Umgebungsvariablen für Produktion: ${missing.join(', ')}`
    )
  }
}
