import { NextResponse } from 'next/server'
import { getUserBySession, isErrorResponse } from '@/lib/api-auth'
import { cancelPendingEmailChange } from '@/lib/emailVerification'

export async function DELETE() {
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult

  await cancelPendingEmailChange(user.id)

  return NextResponse.json({
    message: 'Ausstehende E-Mail-Änderung wurde abgebrochen.',
  })
}
