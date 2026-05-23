import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  getAccountContext,
  getUserBySession,
} from '@/lib/account-context'
import {
  ACCOUNT_SETTINGS_SELECT,
  isErrorResponse,
  validateSalaryDay,
  validateAccountDisplayName,
} from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { userHasAccountAccess } from '@/lib/accounts'

export async function GET() {
  const ctx = await getAccountContext()
  if (isErrorResponse(ctx)) return ctx

  const { account, membership } = ctx

  return NextResponse.json({
    ...account,
    role: membership.role,
    accountName: account.name,
  })
}

export async function PATCH(request: NextRequest) {
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const body = await request.json()

  if (body.accountId !== undefined) {
    const { user } = authResult
    const accountId = body.accountId as string
    if (!accountId || typeof accountId !== 'string') {
      return NextResponse.json({ error: 'Ungültige Konto-ID' }, { status: 400 })
    }

    const allowed = await userHasAccountAccess(user.id, accountId)
    if (!allowed) {
      return NextResponse.json({ error: 'Kein Zugriff auf dieses Konto' }, { status: 403 })
    }

    return NextResponse.json({
      accountId,
      message: 'Konto gewechselt. Session bitte mit update() aktualisieren.',
    })
  }

  const ctx = await getAccountContext()
  if (isErrorResponse(ctx)) return ctx

  const { account, membership } = ctx

  if (membership.role !== 'OWNER' && membership.role !== 'MEMBER') {
    return NextResponse.json({ error: 'Kein Zugriff' }, { status: 403 })
  }

  const data: { name?: string; salaryDay?: number } = {}

  if (body.salaryDay !== undefined) {
    const salaryDay = validateSalaryDay(body.salaryDay)
    if (isErrorResponse(salaryDay)) return salaryDay
    data.salaryDay = salaryDay
  }

  if (body.accountName !== undefined || body.name !== undefined) {
    const name = validateAccountDisplayName(body.accountName ?? body.name)
    if (isErrorResponse(name)) return name
    if (name) data.name = name
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Keine Änderungen angegeben' }, { status: 400 })
  }

  const updated = await prisma.account.update({
    where: { id: account.id },
    data,
    select: ACCOUNT_SETTINGS_SELECT,
  })

  return NextResponse.json({
    ...updated,
    role: membership.role,
    accountName: updated.name,
  })
}
