import type Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { getStoredPlan, type PlanId, type PlanSourceId } from '@/lib/plans'
import { getStripe, intervalForPrice, type BillingInterval } from '@/lib/stripe'

/** Kulanz nach dem Ende des bezahlten Zeitraums, falls Abbuchung oder Webhook sich verspäten */
export const BILLING_GRACE_DAYS = 3

const DAY_MS = 24 * 60 * 60 * 1000

/** Der für das Level maßgebliche Ausschnitt eines Stripe-Abos */
export type SubscriptionSnapshot = {
  id: string
  status: string
  /** Ende des laufenden (bezahlten oder Test-)Zeitraums */
  periodEnd: Date | null
  cancelAtPeriodEnd: boolean
  endedAt: Date | null
  priceId: string | null
}

export type BillingState = {
  subscriptionId: string | null
  status: string | null
  interval: BillingInterval | null
  cancelAtPeriodEnd: boolean
  /** `null` = das Abo sagt nichts über das Level (z. B. erste Zahlung noch offen) */
  plan: { plan: PlanId; expiresAt: Date } | null
}

const RUNNING = new Set(['active', 'trialing', 'past_due'])
const ENDED = new Set(['canceled', 'unpaid', 'paused', 'incomplete_expired'])

/**
 * Abo-Stand → Level.
 *
 * - läuft (auch im Verzug, solange Stripe noch nachfasst): „Komplett“ bis Periodenende plus Kulanz;
 *   ist zum Periodenende gekündigt, endet es genau dort.
 * - beendet: „Komplett“ ist abgelaufen, es gilt „Start“.
 * - noch nicht bezahlt (`incomplete`): keine Aussage, das Level bleibt, wie es ist.
 */
export function billingStateFromSubscription(
  subscription: SubscriptionSnapshot | null,
  now: Date = new Date()
): BillingState {
  if (!subscription) {
    return {
      subscriptionId: null,
      status: null,
      interval: null,
      cancelAtPeriodEnd: false,
      plan: { plan: 'FULL', expiresAt: now },
    }
  }

  const base = {
    subscriptionId: subscription.id,
    status: subscription.status,
    interval: intervalForPrice(subscription.priceId),
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
  }

  if (RUNNING.has(subscription.status)) {
    const periodEnd = subscription.periodEnd ?? now
    const expiresAt = subscription.cancelAtPeriodEnd
      ? periodEnd
      : new Date(periodEnd.getTime() + BILLING_GRACE_DAYS * DAY_MS)
    return { ...base, plan: { plan: 'FULL', expiresAt } }
  }

  if (ENDED.has(subscription.status)) {
    return {
      ...base,
      cancelAtPeriodEnd: false,
      plan: { plan: 'FULL', expiresAt: subscription.endedAt ?? now },
    }
  }

  return { ...base, plan: null }
}

/** Von mehreren Abos eines Kunden das maßgebliche: ein laufendes, sonst das jüngste */
export function pickSubscription<T extends { status: string; created: number }>(
  subscriptions: T[]
): T | null {
  const byNewest = [...subscriptions].sort((a, b) => b.created - a.created)
  return byNewest.find((s) => RUNNING.has(s.status)) ?? byNewest[0] ?? null
}

function toDate(seconds: number | null | undefined): Date | null {
  return seconds == null ? null : new Date(seconds * 1000)
}

export function toSnapshot(subscription: Stripe.Subscription): SubscriptionSnapshot {
  const item = subscription.items.data[0]
  return {
    id: subscription.id,
    status: subscription.status,
    // Das Periodenende steht an der Abo-Position; im Stripe-Testzeitraum ist es dessen Ende
    periodEnd: toDate(item?.current_period_end ?? subscription.trial_end),
    cancelAtPeriodEnd: subscription.cancel_at_period_end || subscription.cancel_at != null,
    endedAt: toDate(subscription.ended_at),
    priceId: item?.price?.id ?? null,
  }
}

type PlanOwner = { plan: PlanId; planSource: PlanSourceId | null; planExpiresAt: Date | null }

/**
 * Darf Stripe das Level setzen? Nicht, solange „Komplett“ von Hand oder als Bestand vergeben
 * ist und noch gilt – das hat Vorrang und wird nie überschrieben.
 */
export function canBillingSetPlan(user: PlanOwner, now: Date = new Date()): boolean {
  const byHand = user.planSource === 'LEGACY' || user.planSource === 'MANUAL'
  return !(byHand && getStoredPlan(user, now) === 'FULL')
}

export type SyncResult = 'unknown-customer' | 'updated'

/**
 * Gleicht einen Nutzer mit seinem Abo-Stand bei Stripe ab – die einzige Stelle, die das Level
 * aus Stripe heraus setzt. Webhook, Rückkehr vom Kauf und Kündigung rufen alle diese Funktion
 * auf; weil sie immer den aktuellen Stand holt, spielt die Reihenfolge der Ereignisse keine Rolle.
 */
export async function syncCustomer(stripeCustomerId: string): Promise<SyncResult> {
  const user = await prisma.user.findUnique({
    where: { stripeCustomerId },
    select: { id: true, plan: true, planSource: true, planExpiresAt: true },
  })
  if (!user) return 'unknown-customer'

  const subscriptions = await getStripe().subscriptions.list({
    customer: stripeCustomerId,
    status: 'all',
    limit: 20,
  })
  const picked = pickSubscription(subscriptions.data)
  const now = new Date()
  const state = billingStateFromSubscription(picked ? toSnapshot(picked) : null, now)

  // Ohne Abo gibt es nur etwas zu tun, wenn das Level bisher aus Stripe kam
  const setPlan =
    state.plan !== null &&
    canBillingSetPlan(user, now) &&
    (picked !== null || user.planSource === 'STRIPE')

  const before = getStoredPlan(user, now)
  const after = setPlan
    ? getStoredPlan({ plan: state.plan!.plan, planExpiresAt: state.plan!.expiresAt }, now)
    : before

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        stripeSubscriptionId: state.subscriptionId,
        stripeSubscriptionStatus: state.status,
        planInterval: state.interval,
        planCancelAtPeriodEnd: state.cancelAtPeriodEnd,
        ...(setPlan
          ? { plan: state.plan!.plan, planSource: 'STRIPE', planExpiresAt: state.plan!.expiresAt }
          : {}),
      },
    })
    if (setPlan && before !== after) {
      await tx.planChange.create({
        data: {
          userId: user.id,
          fromPlan: before,
          toPlan: after,
          source: 'STRIPE',
          expiresAt: after === 'FULL' ? state.plan!.expiresAt : null,
        },
      })
    }
  })

  return 'updated'
}

/** Stripe-Kunde des Nutzers; wird beim ersten Kauf angelegt */
export async function ensureStripeCustomer(user: {
  id: string
  email: string
  stripeCustomerId: string | null
}): Promise<string> {
  if (user.stripeCustomerId) return user.stripeCustomerId

  const customer = await getStripe().customers.create({
    email: user.email,
    metadata: { userId: user.id },
  })
  await prisma.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customer.id },
  })
  return customer.id
}

const RUNNING_STATUSES = ['active', 'trialing', 'past_due'] as const

async function runningSubscriptions(stripeCustomerId: string) {
  const subscriptions = await getStripe().subscriptions.list({
    customer: stripeCustomerId,
    status: 'all',
    limit: 20,
  })
  return subscriptions.data.filter((s) =>
    (RUNNING_STATUSES as readonly string[]).includes(s.status)
  )
}

/**
 * Kündigt das laufende Abo zum Ende des bezahlten Zeitraums und gleicht danach ab.
 * Liefert das Datum, zu dem es endet – `null`, wenn kein Abo läuft.
 */
export async function cancelAtPeriodEnd(stripeCustomerId: string): Promise<Date | null> {
  const running = await runningSubscriptions(stripeCustomerId)
  if (running.length === 0) return null

  let endsAt: Date | null = null
  for (const subscription of running) {
    const updated = await getStripe().subscriptions.update(subscription.id, {
      cancel_at_period_end: true,
    })
    endsAt ??= toSnapshot(updated).periodEnd
  }
  await syncCustomer(stripeCustomerId)
  return endsAt
}

/**
 * Beendet alle laufenden Abos sofort – vor dem Löschen eines Nutzers, damit nicht weiter
 * abgebucht wird. Wirft, wenn Stripe nicht erreichbar ist; dann darf nicht gelöscht werden.
 */
export async function cancelSubscriptionsNow(stripeCustomerId: string): Promise<void> {
  for (const subscription of await runningSubscriptions(stripeCustomerId)) {
    await getStripe().subscriptions.cancel(subscription.id)
  }
}

/** Gibt eine geänderte E-Mail-Adresse an Stripe weiter (Rechnungen, Belege) */
export async function updateStripeCustomerEmail(
  stripeCustomerId: string,
  email: string
): Promise<void> {
  await getStripe().customers.update(stripeCustomerId, { email })
}
