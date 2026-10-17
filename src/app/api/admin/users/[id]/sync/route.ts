import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'
import { isErrorResponse } from '@/lib/api-auth'
import { syncCustomer } from '@/lib/billing'
import { withErrorHandling } from '@/lib/route-handler'
import { billingEnabled } from '@/lib/stripe'

type RouteParams = { params: Promise<{ id: string }> }

/** Verwaltung: Abo-Stand eines Nutzers von Hand mit Stripe abgleichen (z. B. nach verpasstem Webhook) */
export const POST = withErrorHandling('/api/admin/users/:id/sync', async function POST(_request: NextRequest, { params }: RouteParams) {
  const admin = await requireAdmin()
  if (isErrorResponse(admin)) return admin

  if (!billingEnabled()) {
    return NextResponse.json({ error: 'Stripe ist nicht eingerichtet' }, { status: 400 })
  }

  const { id } = await params
  const user = await prisma.user.findUnique({ where: { id }, select: { stripeCustomerId: true } })
  if (!user) {
    return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 })
  }
  if (!user.stripeCustomerId) {
    return NextResponse.json({ error: 'Für diese Person gibt es kein Abo bei Stripe' }, { status: 400 })
  }

  await syncCustomer(user.stripeCustomerId)
  return NextResponse.json({ synced: true })
})
