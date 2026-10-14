import { SMTP_ENV_KEYS } from '@/lib/email'
import { STRIPE_ENV_KEYS, missingStripeEnv } from '@/lib/stripe'

/**
 * Pflicht-Umgebungsvariablen für Produktion (öffentliches Hosting).
 */
export function assertProductionEnv(): void {
  if (process.env.NODE_ENV !== 'production') return
  // `next build` lädt Routen-Module zum Sammeln der Seitendaten – dort sind keine
  // Laufzeit-Secrets nötig (z. B. CI ohne .env). Geprüft wird beim Serverstart.
  if (process.env.NEXT_PHASE === 'phase-production-build') return

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
  // Ohne explizite Entscheidung teilen sich hinter einem Reverse-Proxy alle
  // Besucher dieselben Rate-Limit-Buckets (globaler Registrierungs-DoS möglich).
  if (process.env.TRUST_PROXY !== 'true' && process.env.TRUST_PROXY !== 'false') {
    missing.push(
      'TRUST_PROXY ("true" hinter Reverse-Proxy wie nginx/Caddy, sonst "false")'
    )
  }
  for (const key of SMTP_ENV_KEYS) {
    if (!process.env[key]) {
      missing.push(key)
    }
  }

  // Stripe ist freiwillig – aber nur ganz oder gar nicht
  const missingStripe = missingStripeEnv()
  if (missingStripe.length > 0 && missingStripe.length < STRIPE_ENV_KEYS.length) {
    missing.push(...missingStripe.map((key) => `${key} (Stripe ist nur teilweise eingerichtet)`))
  }

  if (missing.length > 0) {
    throw new Error(
      `Fehlende Umgebungsvariablen für Produktion: ${missing.join(', ')}`
    )
  }
}
