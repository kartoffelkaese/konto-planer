import { NextResponse } from 'next/server'
import type { User } from '@prisma/client'
import { getUserBySession } from '@/lib/account-context'
import { isErrorResponse } from '@/lib/api-auth'
import { plansEnabled } from '@/lib/plans'

/**
 * Zugang zur Verwaltung: nur Nutzer mit Admin-Recht (`npm run set-admin`) und nur, wenn
 * Level aktiv sind. Alle anderen bekommen 404 – die Verwaltung gibt sich nicht zu erkennen.
 */
export async function requireAdmin(): Promise<{ user: User } | NextResponse> {
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  if (!authResult.user.isAdmin || !plansEnabled()) {
    return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  }

  return { user: authResult.user }
}
