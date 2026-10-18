import { NextResponse } from 'next/server'
import { AccountMemberRole } from '@prisma/client'
import { getAccountContext } from '@/lib/account-context'
import { isErrorResponse, readJsonBody } from '@/lib/api-auth'
import {
  getResettableAccounts,
  RESET_ALL_CONFIRM_TEXT,
  RESET_LEVELS,
  resetAccounts,
  type ResetLevel,
} from '@/lib/accountReset'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'
import { withErrorHandling } from '@/lib/route-handler'

/** Eigene Konten mit Zählwerten für den Dialog „Konto zurücksetzen“ */
export const GET = withErrorHandling('/api/accounts/reset', async function GET() {
  const ctx = await getAccountContext()
  if (isErrorResponse(ctx)) return ctx

  const accounts = await getResettableAccounts(ctx.user.id)
  return NextResponse.json({ activeAccountId: ctx.account.id, accounts })
})

/**
 * Setzt das aktive Konto oder alle eigenen Konten zurück. Nur für Inhaber; geteilte Konten
 * anderer sind nie betroffen. Bestätigt wird mit dem Kontonamen bzw. „ZURÜCKSETZEN“.
 */
export const POST = withErrorHandling('/api/accounts/reset', async function POST(request: Request) {
  const ctx = await getAccountContext()
  if (isErrorResponse(ctx)) return ctx

  const body = await readJsonBody<{ scope?: unknown; level?: unknown; confirmText?: unknown }>(request)
  if (isErrorResponse(body)) return body

  const scope = body.scope
  const level = body.level
  if ((scope !== 'current' && scope !== 'all') || !RESET_LEVELS.includes(level as ResetLevel)) {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
  }

  if (scope === 'current' && ctx.membership.role !== AccountMemberRole.OWNER) {
    return NextResponse.json(
      { error: 'Nur der Inhaber kann dieses Konto zurücksetzen' },
      { status: 403 }
    )
  }

  const ip = getClientIp(request.headers)
  const { allowed } = checkRateLimit(`account-reset:${ip}:${ctx.user.id}`, RATE_LIMITS.accountReset)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Zu viele Versuche. Bitte später erneut versuchen.' },
      { status: 429 }
    )
  }

  const owned = await getResettableAccounts(ctx.user.id)
  const targets = scope === 'all' ? owned : owned.filter((account) => account.id === ctx.account.id)
  if (targets.length === 0) {
    return NextResponse.json({ error: 'Kein eigenes Konto zum Zurücksetzen gefunden' }, { status: 400 })
  }

  const expected = scope === 'all' ? RESET_ALL_CONFIRM_TEXT : ctx.account.name
  const confirmText = typeof body.confirmText === 'string' ? body.confirmText.trim() : ''
  if (confirmText !== expected.trim()) {
    return NextResponse.json(
      { error: `Bitte gib zur Bestätigung exakt „${expected}“ ein` },
      { status: 400 }
    )
  }

  const result = await resetAccounts(
    targets.map((account) => account.id),
    level as ResetLevel
  )
  return NextResponse.json({ accounts: targets.length, ...result })
})
