import { NextResponse } from 'next/server'
import type { User } from '@prisma/client'
import { getUserBySession } from '@/lib/account-context'
import { isErrorResponse } from '@/lib/api-auth'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { BILLING_GRACE_DAYS } from '@/lib/billing'
import { billingEnabled } from '@/lib/stripe'

/**
 * Gemeinsamer Einstieg der Kauf-Routen: angemeldeter Nutzer, Kauf aktiv, Rate-Limit.
 * Ohne Stripe-Einrichtung antworten die Routen mit 404 – den Kauf gibt es dann nicht.
 */
export async function requireBillingUser(): Promise<{ user: User } | NextResponse> {
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  if (!billingEnabled()) {
    return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  }

  const { allowed } = checkRateLimit(`billing:${authResult.user.id}`, RATE_LIMITS.billing)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Zu viele Versuche. Bitte später erneut versuchen.' },
      { status: 429 }
    )
  }

  return { user: authResult.user }
}

/** Status, bei denen ein Abo läuft bzw. Stripe noch nachfasst */
export function hasRunningSubscription(status: string | null | undefined): boolean {
  return status === 'active' || status === 'trialing' || status === 'past_due'
}

/**
 * Ende des bezahlten Zeitraums eines laufenden Abos, `null` ohne laufendes Abo.
 * Das gespeicherte Ablaufdatum enthält die Kulanz (außer bei Kündigung zum Periodenende) –
 * angezeigt wird das Datum ohne sie.
 */
export function paidPeriodEnd(
  user: Pick<User, 'planSource' | 'planExpiresAt' | 'planCancelAtPeriodEnd' | 'stripeSubscriptionStatus'>
): Date | null {
  if (!hasRunningSubscription(user.stripeSubscriptionStatus)) return null
  if (user.planSource !== 'STRIPE' || !user.planExpiresAt) return null
  if (user.planCancelAtPeriodEnd) return user.planExpiresAt
  return new Date(user.planExpiresAt.getTime() - BILLING_GRACE_DAYS * 24 * 60 * 60 * 1000)
}
