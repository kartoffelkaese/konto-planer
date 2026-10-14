#!/usr/bin/env node
/**
 * Richtet Stripe für das Level „Komplett“ ein: Produkt, Monats- und Jahrespreis und die
 * Einstellung des Kundenportals. Mehrfach ausführbar – Vorhandenes wird wiederverwendet.
 *
 * Ausführen: npm run stripe:setup            (Testmodus, Schlüssel sk_test_…)
 *            npm run stripe:setup -- --live  (Live-Modus, Schlüssel sk_live_…)
 *
 * Der Schlüssel kommt aus STRIPE_SECRET_KEY in der .env. Am Ende stehen die Zeilen, die in
 * die .env gehören. Preise in Cent stehen unten und müssen zu PLAN_PRICE in src/lib/plans.ts passen.
 */
import 'dotenv/config'
import Stripe from 'stripe'

const APP_TAG = 'konto-planer'
const PRODUCT_NAME = 'KontoPlaner Komplett'
const PRICES = [
  { env: 'STRIPE_PRICE_MONTHLY', lookupKey: 'komplett_monthly', amount: 300, interval: 'month' },
  { env: 'STRIPE_PRICE_YEARLY', lookupKey: 'komplett_yearly', amount: 2400, interval: 'year' },
]

const key = process.env.STRIPE_SECRET_KEY
const live = process.argv.includes('--live')

if (!key) {
  console.error('STRIPE_SECRET_KEY ist nicht gesetzt (in der .env eintragen).')
  process.exit(1)
}
if (key.startsWith('sk_live_') !== live) {
  console.error(
    live
      ? 'Mit --live wird ein Live-Schlüssel (sk_live_…) erwartet.'
      : 'Das ist ein Live-Schlüssel. Für den Live-Modus bewusst mit --live aufrufen.'
  )
  process.exit(1)
}

const baseUrl = (process.env.AUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '')
const stripe = new Stripe(key)

async function findOrCreateProduct() {
  for await (const product of stripe.products.list({ active: true, limit: 100 })) {
    if (product.metadata?.app === APP_TAG) return product
  }
  return stripe.products.create({ name: PRODUCT_NAME, metadata: { app: APP_TAG } })
}

async function findOrCreatePrice(productId, { lookupKey, amount, interval }) {
  const existing = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 })
  const found = existing.data[0]
  if (found) {
    if (found.unit_amount !== amount || found.recurring?.interval !== interval) {
      console.warn(
        `Hinweis: Der vorhandene Preis ${lookupKey} (${found.unit_amount} Cent/${found.recurring?.interval}) weicht von ${amount} Cent/${interval} ab und wird unverändert verwendet.`
      )
    }
    return found
  }
  return stripe.prices.create({
    product: productId,
    currency: 'eur',
    unit_amount: amount,
    recurring: { interval },
    lookup_key: lookupKey,
    metadata: { app: APP_TAG },
  })
}

async function findOrCreatePortalConfiguration(productId, priceIds) {
  for await (const configuration of stripe.billingPortal.configurations.list({ active: true, limit: 100 })) {
    if (configuration.metadata?.app === APP_TAG) return configuration
  }
  return stripe.billingPortal.configurations.create({
    metadata: { app: APP_TAG },
    default_return_url: `${baseUrl}/settings#plan`,
    business_profile: { headline: 'KontoPlaner – Abo verwalten' },
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      customer_update: { enabled: true, allowed_updates: ['address', 'name'] },
      subscription_cancel: { enabled: true, mode: 'at_period_end' },
      subscription_update: {
        enabled: true,
        default_allowed_updates: ['price'],
        proration_behavior: 'create_prorations',
        products: [{ product: productId, prices: priceIds }],
      },
    },
  })
}

const product = await findOrCreateProduct()
const prices = []
for (const definition of PRICES) {
  prices.push({ ...definition, price: await findOrCreatePrice(product.id, definition) })
}
const portal = await findOrCreatePortalConfiguration(
  product.id,
  prices.map(({ price }) => price.id)
)

console.log(`\nStripe (${live ? 'Live' : 'Test'}modus) ist eingerichtet. Diese Zeilen gehören in die .env:\n`)
for (const { env, price } of prices) console.log(`${env}=${price.id}`)
console.log(`STRIPE_PORTAL_CONFIGURATION=${portal.id}`)
console.log(
  `\nNoch offen: STRIPE_WEBHOOK_SECRET.\n` +
    `  Lokal:  stripe listen --all-snapshot --forward-to localhost:3000/api/stripe/webhook  (zeigt whsec_…)\n` +
    `  Server: im Stripe-Dashboard einen Webhook auf ${baseUrl}/api/stripe/webhook anlegen.\n`
)
