import { NextResponse } from 'next/server'
import { getAccountContext } from '@/lib/account-context'
import { isErrorResponse } from '@/lib/api-auth'
import { getTransferTargets } from '@/lib/transfers'

export async function GET() {
  const ctx = await getAccountContext()
  if (isErrorResponse(ctx)) return ctx

  const { user, account } = ctx
  const targets = await getTransferTargets(user.id, account.id)

  return NextResponse.json(targets)
}
