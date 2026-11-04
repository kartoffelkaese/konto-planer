import { NextResponse } from 'next/server'
import type { User } from '@prisma/client'
import { getUserBySession } from '@/lib/account-context'
import { isErrorResponse } from '@/lib/api-auth'
import { plansEnabled } from '@/lib/plans'

/**
 * Zugang zur Verwaltung: nur Nutzer mit Admin-Recht (`npm run set-admin`). Mit `plans: true`
 * zusätzlich nur, wenn Level aktiv sind (Level setzen, Verlauf, Stripe-Abgleich).
 * Alle anderen bekommen 404 – die Verwaltung gibt sich nicht zu erkennen.
 */
export async function requireAdmin(
  options: { plans?: boolean } = {}
): Promise<{ user: User } | NextResponse> {
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  if (!authResult.user.isAdmin || (options.plans && !plansEnabled())) {
    return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  }

  return { user: authResult.user }
}
