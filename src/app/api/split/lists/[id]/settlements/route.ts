import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserBySession, isErrorResponse } from '@/lib/api-auth'
import {
  requireSplitListAccess,
  requireSplitListWrite,
} from '@/lib/splitAccess'
import { serializeSettlement } from '@/lib/splitSerialize'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const access = await requireSplitListAccess(authResult.user.id, id)
  if (access instanceof NextResponse) return access

  const settlements = await prisma.splitSettlement.findMany({
    where: { splitListId: id },
    include: { fromParticipant: true, toParticipant: true },
    orderBy: [{ settledAt: 'desc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json(settlements.map(serializeSettlement))
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const access = await requireSplitListAccess(authResult.user.id, id)
  if (access instanceof NextResponse) return access

  const writeError = requireSplitListWrite(access)
  if (writeError) return writeError

  let body: {
    fromParticipantId?: string
    toParticipantId?: string
    amount?: number
    note?: string
    settledAt?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
  }

  if (!body.fromParticipantId || !body.toParticipantId) {
    return NextResponse.json(
      { error: 'Von- und An-Teilnehmer sind erforderlich' },
      { status: 400 }
    )
  }

  if (body.fromParticipantId === body.toParticipantId) {
    return NextResponse.json(
      { error: 'Von und An müssen unterschiedlich sein' },
      { status: 400 }
    )
  }

  if (body.amount == null || Number.isNaN(body.amount) || body.amount <= 0) {
    return NextResponse.json(
      { error: 'Betrag muss größer als 0 sein' },
      { status: 400 }
    )
  }

  const participants = await prisma.splitParticipant.findMany({
    where: {
      splitListId: id,
      id: { in: [body.fromParticipantId, body.toParticipantId] },
    },
  })

  if (participants.length !== 2) {
    return NextResponse.json(
      { error: 'Teilnehmer nicht gefunden' },
      { status: 400 }
    )
  }

  const settlement = await prisma.splitSettlement.create({
    data: {
      splitListId: id,
      fromParticipantId: body.fromParticipantId,
      toParticipantId: body.toParticipantId,
      amount: Math.round(body.amount * 100) / 100,
      settledAt: body.settledAt ? new Date(body.settledAt) : new Date(),
      settledById: authResult.user.id,
      note: body.note?.trim() || null,
    },
    include: { fromParticipant: true, toParticipant: true },
  })

  return NextResponse.json(serializeSettlement(settlement), { status: 201 })
}
