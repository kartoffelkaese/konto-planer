import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { EmailVerificationPurpose } from '@prisma/client'
import { verifyEmailToken } from '@/lib/emailVerification'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(
      new URL('/auth/login?verifyError=missing', request.url)
    )
  }

  const result = await verifyEmailToken(token)

  if (!result.ok) {
    const params = new URLSearchParams({ verifyError: result.error })
    return NextResponse.redirect(
      new URL(`/auth/login?${params.toString()}`, request.url)
    )
  }

  if (result.purpose === EmailVerificationPurpose.EMAIL_CHANGE) {
    return NextResponse.redirect(
      new URL('/auth/login?emailChanged=true', request.url)
    )
  }

  return NextResponse.redirect(new URL('/auth/login?verified=true', request.url))
}
