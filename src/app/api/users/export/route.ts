import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getUserBySession, isErrorResponse } from '@/lib/api-auth'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { collectUserData } from '@/lib/dataExport/collect'
import { buildExportZip } from '@/lib/dataExport/render'
import { AVAILABLE_LEGAL_PAGES } from '@/lib/legalPages'
import { getSiteUrl } from '@/lib/siteMetadata'
import { formatDateForInput } from '@/lib/dateUtils'

/**
 * Datenexport nach DSGVO: alle Daten des Nutzers als ZIP (Übersicht.html, CSV, JSON).
 * Das Passwort steht im Body – nie in der Adresse.
 */
export async function POST(request: Request) {
  try {
    const authResult = await getUserBySession()
    if (isErrorResponse(authResult)) return authResult

    const { user } = authResult

    const ip = getClientIp(request.headers)
    const { allowed } = checkRateLimit(`data-export:${ip}:${user.id}`, RATE_LIMITS.dataExport)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Zu viele Versuche. Bitte versuche es später erneut.' },
        { status: 429 }
      )
    }

    let body: { password?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Passwort ist erforderlich' }, { status: 400 })
    }

    if (typeof body.password !== 'string' || !body.password) {
      return NextResponse.json({ error: 'Passwort ist erforderlich' }, { status: 400 })
    }

    const isPasswordValid = await bcrypt.compare(body.password, user.passwordHash)
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Falsches Passwort' }, { status: 400 })
    }

    const now = new Date()
    const data = await collectUserData(user, now)
    const privacyUrl = AVAILABLE_LEGAL_PAGES.some((page) => page.slug === 'datenschutz')
      ? new URL('/datenschutz', getSiteUrl()).href
      : null
    const zip = buildExportZip(data, { privacyUrl })

    logger.info('Datenexport erstellt', { endpoint: '/api/users/export', userId: user.id })

    return new NextResponse(new Blob([zip as Uint8Array<ArrayBuffer>], { type: 'application/zip' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="kontoplaner-daten-${formatDateForInput(now)}.zip"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    logger.error('Fehler beim Datenexport', error, { endpoint: '/api/users/export' })
    return NextResponse.json({ error: 'Interner Server-Fehler' }, { status: 500 })
  }
}
