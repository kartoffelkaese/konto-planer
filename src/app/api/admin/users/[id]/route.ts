import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'
import { isErrorResponse, readJsonBody } from '@/lib/api-auth'
import { normalizeEmail } from '@/lib/accounts'
import { logger } from '@/lib/logger'
import { withErrorHandling } from '@/lib/route-handler'
import { deleteUserWithData } from '@/lib/userDelete'

type RouteParams = { params: Promise<{ id: string }> }

/**
 * Nutzer samt eigener Daten löschen (siehe `deleteUserWithData`). Zur Sicherheit muss die
 * E-Mail-Adresse des Nutzers mitgeschickt werden; Admins lassen sich so nicht löschen.
 */
export const DELETE = withErrorHandling('/api/admin/users/:id', async function DELETE(request: NextRequest, { params }: RouteParams) {
  const admin = await requireAdmin()
  if (isErrorResponse(admin)) return admin

  const { id } = await params
  const body = await readJsonBody<{ confirmEmail?: unknown }>(request)
  if (isErrorResponse(body)) return body

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, isAdmin: true },
  })
  if (!target) {
    return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 })
  }

  if (target.id === admin.user.id) {
    return NextResponse.json(
      { error: 'Deine eigene Anmeldung löschst du in den Einstellungen' },
      { status: 400 }
    )
  }

  if (target.isAdmin) {
    return NextResponse.json(
      { error: 'Admins können nicht gelöscht werden. Entziehe zuerst das Admin-Recht.' },
      { status: 400 }
    )
  }

  if (
    typeof body.confirmEmail !== 'string' ||
    normalizeEmail(body.confirmEmail) !== normalizeEmail(target.email)
  ) {
    return NextResponse.json(
      { error: 'Die E-Mail-Adresse stimmt nicht überein' },
      { status: 400 }
    )
  }

  await deleteUserWithData(target.id)
  logger.info('Nutzer über die Verwaltung gelöscht', {
    endpoint: '/api/admin/users/:id',
    userId: target.id,
    adminId: admin.user.id,
  })

  return NextResponse.json({ message: 'Benutzer gelöscht' })
})
