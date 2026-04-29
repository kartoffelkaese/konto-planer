import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { auth } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const session = await auth()
    const body = await request.json()

    logger.error(
      'Client Error',
      new Error(body.message || 'Unknown error'),
      {
        type: body.type || 'client-error',
        stack: body.stack,
        digest: body.digest,
        userAgent: body.userAgent,
        url: body.url,
        userId: session?.user?.email || 'anonymous'
      }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    // Selbst wenn das Logging fehlschlägt, sollten wir nicht crashen
    console.error('Error logging failed:', error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}

