import { NextResponse } from 'next/server'
import { getAccountContext, requireWritableContext } from '@/lib/account-context'
import { isErrorResponse } from '@/lib/api-auth'
import { createDuePendingInstances } from '@/lib/recurringAutoPending'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { withErrorHandling } from '@/lib/route-handler'

/**
 * Trägt fällige wiederkehrende Zahlungen des aktiven Kontos als ausstehende Buchungen ein
 * (je nach Einstellung des Kontos). Ruft die App beim Öffnen auf; ohne Schreibrecht oder bei
 * einfachen Konten gibt es still eine leere Liste.
 */
export const POST = withErrorHandling('/api/transactions/auto-pending', async function POST() {
  const ctx = await getAccountContext()
  if (isErrorResponse(ctx)) return ctx
  if (requireWritableContext(ctx)) return NextResponse.json([])

  const { allowed } = checkRateLimit(`auto-pending:${ctx.user.id}`, RATE_LIMITS.autoPending)
  if (!allowed) return NextResponse.json([])

  return NextResponse.json(await createDuePendingInstances(ctx.account))
})
