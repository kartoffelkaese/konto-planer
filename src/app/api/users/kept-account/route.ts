import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { AccountMemberRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getUserBySession, isErrorResponse, readJsonBody } from '@/lib/api-auth'
import { withErrorHandling } from '@/lib/route-handler'

/**
 * Legt fest, welches eigene Konto beschreibbar bleibt, wenn mehr Konten vorhanden sind,
 * als das Level erlaubt (siehe `writableOwnedAccountIds` in `@/lib/plans`).
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

  const membership = await prisma.accountMember.findUnique({
    where: { accountId_userId: { accountId, userId: authResult.user.id } },
    select: { role: true },
  })
  if (membership?.role !== AccountMemberRole.OWNER) {
    return NextResponse.json(
      { error: 'Du kannst nur ein eigenes Konto auswählen' },
      { status: 403 }
    )
  }

  await prisma.user.update({
    where: { id: authResult.user.id },
    data: { keptAccountId: accountId },
  })

  return NextResponse.json({ keptAccountId: accountId })
})
