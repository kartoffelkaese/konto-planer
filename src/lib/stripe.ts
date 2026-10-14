import Stripe from 'stripe'
import { plansEnabled } from '@/lib/plans'

export type BillingInterval = 'MONTHLY' | 'YEARLY'

/** Pflichtangaben für den Kauf über Stripe – nur vollständig gesetzt ist der Kauf aktiv */
export const STRIPE_ENV_KEYS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_MONTHLY',
  'STRIPE_PRICE_YEARLY',
] as const

/** Welche der Stripe-Angaben fehlen (leer = vollständig) */
export function missingStripeEnv(): string[] {
  return STRIPE_ENV_KEYS.filter((key) => !process.env[key])
}

/**
 * „Komplett“ lässt sich nur buchen, wenn Level aktiv und alle Stripe-Angaben gesetzt sind.
 * Sonst bleibt es bei der Vergabe von Hand über die Verwaltung.
 */
export function billingEnabled(): boolean {
  return plansEnabled() && missingStripeEnv().length === 0
}

let client: Stripe | null = null

/** Der eine Stripe-Client der App (nur Server) */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY ist nicht gesetzt')
  client ??= new Stripe(key)
  return client
}

export function priceIdFor(interval: BillingInterval): string {
  const priceId =
    interval === 'YEARLY' ? process.env.STRIPE_PRICE_YEARLY : process.env.STRIPE_PRICE_MONTHLY
  if (!priceId) throw new Error(`Stripe-Preis für ${interval} ist nicht gesetzt`)
  return priceId
}

export function intervalForPrice(priceId: string | null | undefined): BillingInterval | null {
  if (!priceId) return null
  if (priceId === process.env.STRIPE_PRICE_YEARLY) return 'YEARLY'
  if (priceId === process.env.STRIPE_PRICE_MONTHLY) return 'MONTHLY'
  return null
}
