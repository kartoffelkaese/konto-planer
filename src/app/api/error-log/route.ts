import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { getUserBySession, isErrorResponse } from '@/lib/api-auth'
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
} from '@/lib/rate-limit'

const MAX_MESSAGE_LENGTH = 500
const MAX_STACK_LENGTH = 4096

export async function POST(request: Request) {
  try {
    const authResult = await getUserBySession()
    if (isErrorResponse(authResult)) return authResult

    const ip = getClientIp(request.headers)
    const { allowed } = checkRateLimit(
      `error-log:${ip}`,
      RATE_LIMITS.errorLog
    )
    if (!allowed) {
      return NextResponse.json({ success: false }, { status: 429 })
    }

    const body = await request.json()

    const message =
      typeof body.message === 'string'
        ? body.message.slice(0, MAX_MESSAGE_LENGTH)
        : 'Unknown error'
    const stack =
      typeof body.stack === 'string'
        ? body.stack.slice(0, MAX_STACK_LENGTH)
        : undefined

    logger.error('Client Error', new Error(message), {
      type:
        typeof body.type === 'string' ? body.type.slice(0, 100) : 'client-error',
      stack,
      digest:
        typeof body.digest === 'string' ? body.digest.slice(0, 100) : undefined,
      url: typeof body.url === 'string' ? body.url.slice(0, 500) : undefined,
      userId: authResult.email,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error logging failed:', error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
