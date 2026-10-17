#!/usr/bin/env node
/**
 * Entfernt Stripe-Testdaten aus der Datenbank – vor dem Live-Gang, wenn Nutzer noch Kunden
 * aus der Sandbox tragen. Sonst scheitern für sie „Abo verwalten“ und der Kauf mit dem
 * Live-Schlüssel, weil Stripe die Kunden-Kennung dort nicht kennt.
 *
 * Ausführen: npm run stripe:cleanup            (zeigt nur an, was betroffen wäre)
 *            npm run stripe:cleanup -- --apply  (leert die Stripe-Felder der Betroffenen)
 *
 * Betroffen ist, wessen Kunden-Kennung es mit dem Schlüssel aus STRIPE_SECRET_KEY bei Stripe
 * nicht (mehr) gibt. Erwartet einen Live-Schlüssel (sk_live_…) – mit einem Test-Schlüssel
 * würden sonst gerade die echten Kunden als „unbekannt“ gelten.
 *
 * Kam das Level aus Stripe („Komplett“ über das Test-Abo), fällt es auf „Start“ zurück und
 * wird protokolliert. Von Hand vergebenes „Komplett“ und Bestand bleiben unverändert.
 */
import 'dotenv/config'
import Stripe from 'stripe'
import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

const apply = process.argv.includes('--apply')
const key = process.env.STRIPE_SECRET_KEY
const databaseUrl = process.env.DATABASE_URL

if (!key || !key.startsWith('sk_live_')) {
  console.error(
    'STRIPE_SECRET_KEY muss ein Live-Schlüssel (sk_live_…) sein. Erst den Live-Schlüssel in die .env eintragen, dann aufräumen.'
  )
  process.exit(1)
}
if (!databaseUrl) {
  console.error('DATABASE_URL ist nicht gesetzt.')
  process.exit(1)
}

const stripe = new Stripe(key)
const prisma = new PrismaClient({ adapter: new PrismaMariaDb(databaseUrl) })

/** Gibt es den Kunden mit diesem Schlüssel? Andere Fehler brechen ab, statt falsch zu leeren. */
async function customerExists(id) {
  try {
    const customer = await stripe.customers.retrieve(id)
    return !customer.deleted
  } catch (err) {
    if (err?.code === 'resource_missing') return false
    throw err
  }
}

function storedPlan(user, now) {
  return user.plan === 'FULL' && (!user.planExpiresAt || user.planExpiresAt > now) ? 'FULL' : 'BASIC'
}

async function main() {
  const users = await prisma.user.findMany({
    where: { stripeCustomerId: { not: null } },
    select: {
      id: true,
      email: true,
      plan: true,
      planSource: true,
      planExpiresAt: true,
      stripeCustomerId: true,
      stripeSubscriptionStatus: true,
    },
    orderBy: { email: 'asc' },
  })

  const stale = []
  for (const user of users) {
    if (!(await customerExists(user.stripeCustomerId))) stale.push(user)
  }

  console.log(`${users.length} Nutzer mit Stripe-Kunde, davon ${stale.length} ohne Kunden im Live-Modus.`)
  if (stale.length === 0) return

  const now = new Date()
  for (const user of stale) {
    const resetPlan = user.planSource === 'STRIPE'
    console.log(
      `- ${user.email} · ${user.stripeCustomerId} · Abo: ${user.stripeSubscriptionStatus ?? '–'} · Level: ${user.plan} (${user.planSource ?? '–'})${resetPlan ? ' → Start' : ''}`
    )
  }

  if (!apply) {
    console.log('\nNichts geändert. Zum Leeren erneut mit --apply aufrufen: npm run stripe:cleanup -- --apply')
    return
  }

  for (const user of stale) {
    const resetPlan = user.planSource === 'STRIPE'
    const before = storedPlan(user, now)
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          stripeSubscriptionStatus: null,
          planInterval: null,
          planCancelAtPeriodEnd: false,
          ...(resetPlan ? { plan: 'BASIC', planExpiresAt: null } : {}),
        },
      })
      if (resetPlan && before !== 'BASIC') {
        await tx.planChange.create({
          data: {
            userId: user.id,
            fromPlan: before,
            toPlan: 'BASIC',
            source: 'STRIPE',
            note: 'Stripe-Testdaten entfernt',
          },
        })
      }
    })
  }
  console.log(`\n${stale.length} Nutzer bereinigt.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
