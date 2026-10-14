import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isKeptAccountChoiceRequired, ownedAccountIds } from '@/lib/keptAccount'
import { getUserBySession, isErrorResponse, readJsonBody } from '@/lib/api-auth'
import { withErrorHandling } from '@/lib/route-handler'
import { formatDate } from '@/lib/dateUtils'
import {
  KEPT_ACCOUNT_CHANGE_DAYS,
  keptAccountChangeAllowedAt,
  writableOwnedAccountIds,
} from '@/lib/plans'

/**
 * Legt fest, welches eigene Konto beschreibbar bleibt, wenn mehr Konten vorhanden sind,
 * als das Level erlaubt (siehe `writableOwnedAccountIds` in `@/lib/plans`). Die erste Wahl ist
 * frei, danach ist ein Wechsel nur einmal in `KEPT_ACCOUNT_CHANGE_DAYS` Tagen möglich. Nach jeder
 * Herabstufung ist die Wahl wieder frei (siehe `isKeptAccountChoiceRequired`).
 */
export const PATCH = withErrorHandling('/api/users/kept-account', async function PATCH(request: NextRequest) {
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const body = await readJsonBody<{ accountId?: unknown }>(request)
  if (isErrorResponse(body)) return body

  const accountId = body.accountId
  if (typeof accountId !== 'string' || !accountId) {
    return NextResponse.json({ error: 'Konto erforderlich' }, { status: 400 })
  }

  const { user } = authResult
  const ownedIds = await ownedAccountIds(user.id)
  if (!ownedIds.includes(accountId)) {
    return NextResponse.json(
      { error: 'Du kannst nur ein eigenes Konto auswählen' },
      { status: 403 }
    )
  }

  // Nach einer Herabstufung ist die Wahl frei und wird auch dann vermerkt, wenn das bisherige
  // Konto bestätigt wird – sonst würde erneut gefragt
  const choiceRequired = await isKeptAccountChoiceRequired(user, ownedIds)

  // Das bisher beschreibbare Konto: das gewählte, sonst das älteste
  const current = writableOwnedAccountIds(ownedIds, user.keptAccountId, 1)?.[0] ?? ownedIds[0]
  if (accountId === current && !choiceRequired) {
    return NextResponse.json({ keptAccountId: accountId })
  }

  const allowedAt = choiceRequired ? null : keptAccountChangeAllowedAt(user.keptAccountChangedAt)
  if (allowedAt) {
    return NextResponse.json(
      {
        error: `Das beschreibbare Konto lässt sich nur einmal in ${KEPT_ACCOUNT_CHANGE_DAYS} Tagen wechseln – wieder ab dem ${formatDate(allowedAt)}.`,
        allowedAt: allowedAt.toISOString(),
      },
      { status: 409 }
    )
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { keptAccountId: accountId, keptAccountChangedAt: new Date() },
  })

  return NextResponse.json({ keptAccountId: accountId })
})
