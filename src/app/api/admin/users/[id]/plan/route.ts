import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'
import { isErrorResponse, readJsonBody } from '@/lib/api-auth'
import { withErrorHandling } from '@/lib/route-handler'
import type { AdminPlanChange } from '@/types/admin'

type RouteParams = { params: Promise<{ id: string }> }

const MAX_NOTE_LENGTH = 500

/** Verlauf der Level-Änderungen eines Nutzers, neueste zuerst */
export const GET = withErrorHandling('/api/admin/users/:id/plan', async function GET(_request: NextRequest, { params }: RouteParams) {
  const admin = await requireAdmin()
  if (isErrorResponse(admin)) return admin

  const { id } = await params
  const changes = await prisma.planChange.findMany({
    where: { userId: id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { changedBy: { select: { email: true } } },
  })

  const body: AdminPlanChange[] = changes.map((change) => ({
    id: change.id,
    fromPlan: change.fromPlan,
    toPlan: change.toPlan,
    source: change.source,
    expiresAt: change.expiresAt?.toISOString() ?? null,
    note: change.note,
    changedByEmail: change.changedBy?.email ?? null,
    createdAt: change.createdAt.toISOString(),
  }))

  return NextResponse.json(body)
})

/** Level von Hand setzen – optional befristet, immer mit Protokolleintrag */
export const PATCH = withErrorHandling('/api/admin/users/:id/plan', async function PATCH(request: NextRequest, { params }: RouteParams) {
  const admin = await requireAdmin()
  if (isErrorResponse(admin)) return admin

  const { id } = await params
  const body = await readJsonBody<{ plan?: unknown; expiresAt?: unknown; note?: unknown }>(request)
  if (isErrorResponse(body)) return body

  if (body.plan !== 'BASIC' && body.plan !== 'FULL') {
    return NextResponse.json({ error: 'Ungültiges Level' }, { status: 400 })
  }
  const plan = body.plan

  let expiresAt: Date | null = null
  if (plan === 'FULL' && body.expiresAt != null && body.expiresAt !== '') {
    if (typeof body.expiresAt !== 'string') {
      return NextResponse.json({ error: 'Ungültiges Ablaufdatum' }, { status: 400 })
    }
    expiresAt = new Date(body.expiresAt)
    if (Number.isNaN(expiresAt.getTime())) {
      return NextResponse.json({ error: 'Ungültiges Ablaufdatum' }, { status: 400 })
    }
    if (expiresAt.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: 'Das Ablaufdatum muss in der Zukunft liegen' },
        { status: 400 }
      )
    }
  }

  let note: string | null = null
  if (body.note != null && body.note !== '') {
    if (typeof body.note !== 'string' || body.note.length > MAX_NOTE_LENGTH) {
      return NextResponse.json(
        { error: `Die Notiz darf höchstens ${MAX_NOTE_LENGTH} Zeichen lang sein` },
        { status: 400 }
      )
    }
    note = body.note.trim() || null
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, plan: true },
  })
  if (!target) {
    return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 })
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.planChange.create({
      data: {
        userId: target.id,
        fromPlan: target.plan,
        toPlan: plan,
        source: 'MANUAL',
        expiresAt,
        note,
        changedById: admin.user.id,
      },
    })
    return tx.user.update({
      where: { id: target.id },
      data: { plan, planSource: 'MANUAL', planExpiresAt: expiresAt },
      select: { id: true, plan: true, planSource: true, planExpiresAt: true },
    })
  })

  return NextResponse.json({
    id: updated.id,
    plan: updated.plan,
    planSource: updated.planSource,
    planExpiresAt: updated.planExpiresAt?.toISOString() ?? null,
  })
})
