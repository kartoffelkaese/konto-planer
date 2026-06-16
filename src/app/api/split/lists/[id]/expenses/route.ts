import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserBySession, isErrorResponse } from '@/lib/api-auth'
import {
  requireSplitListAccess,
  requireSplitListWrite,
} from '@/lib/splitAccess'
import { serializeExpense } from '@/lib/splitSerialize'

type RouteParams = { params: Promise<{ id: string }> }

async function validateExpenseInput(
  splitListId: string,
  body: {
    paidByParticipantId?: string
    amount?: number
    description?: string
    date?: string
    categoryId?: string | null
    shareParticipantIds?: string[]
  }
) {
  if (!body.paidByParticipantId) {
    return NextResponse.json(
      { error: 'Bezahlt-von ist erforderlich' },
      { status: 400 }
    )
  }

  if (body.amount == null || Number.isNaN(body.amount) || body.amount === 0) {
    return NextResponse.json(
      { error: 'Betrag darf nicht 0 sein (negative Beträge für Erstattungen möglich)' },
      { status: 400 }
    )
  }

  const description = body.description?.trim()
  if (!description) {
    return NextResponse.json(
      { error: 'Beschreibung ist erforderlich' },
      { status: 400 }
    )
  }

  if (!body.date) {
    return NextResponse.json({ error: 'Datum ist erforderlich' }, { status: 400 })
  }

  const payer = await prisma.splitParticipant.findFirst({
    where: { id: body.paidByParticipantId, splitListId },
  })
  if (!payer) {
    return NextResponse.json(
      { error: 'Teilnehmer nicht gefunden' },
      { status: 400 }
    )
  }

  if (body.categoryId) {
    const category = await prisma.splitCategory.findFirst({
      where: { id: body.categoryId, splitListId },
    })
    if (!category) {
      return NextResponse.json(
        { error: 'Kategorie nicht gefunden' },
        { status: 400 }
      )
    }
  }

  const allParticipants = await prisma.splitParticipant.findMany({
    where: { splitListId },
    select: { id: true },
  })
  const validIds = new Set(allParticipants.map((p) => p.id))

  const shareIds =
    body.shareParticipantIds && body.shareParticipantIds.length > 0
      ? body.shareParticipantIds
      : allParticipants.map((p) => p.id)

  if (shareIds.length === 0) {
    return NextResponse.json(
      { error: 'Mindestens ein Teilnehmer für die Aufteilung erforderlich' },
      { status: 400 }
    )
  }

  for (const shareId of shareIds) {
    if (!validIds.has(shareId)) {
      return NextResponse.json(
        { error: 'Ungültiger Teilnehmer in Aufteilung' },
        { status: 400 }
      )
    }
  }

  return {
    description,
    shareIds,
    date: new Date(body.date),
    amount: Math.round(body.amount * 100) / 100,
  }
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const access = await requireSplitListAccess(authResult.user.id, id)
  if (access instanceof NextResponse) return access

  const expenses = await prisma.splitExpense.findMany({
    where: { splitListId: id },
    include: {
      paidBy: true,
      category: true,
      shares: { select: { participantId: true } },
    },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json(expenses.map(serializeExpense))
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
    paidByParticipantId?: string
    amount?: number
    description?: string
    date?: string
    categoryId?: string | null
    shareParticipantIds?: string[]
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
  }

  const validated = await validateExpenseInput(id, body)
  if (validated instanceof NextResponse) return validated

  const expense = await prisma.splitExpense.create({
    data: {
      splitListId: id,
      paidByParticipantId: body.paidByParticipantId!,
      categoryId: body.categoryId ?? null,
      amount: validated.amount,
      description: validated.description,
      date: validated.date,
      createdById: authResult.user.id,
      shares: {
        create: validated.shareIds.map((participantId) => ({ participantId })),
      },
    },
    include: {
      paidBy: true,
      category: true,
      shares: { select: { participantId: true } },
    },
  })

  return NextResponse.json(serializeExpense(expense), { status: 201 })
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const access = await requireSplitListAccess(authResult.user.id, id)
  if (access instanceof NextResponse) return access

  const writeError = requireSplitListWrite(access)
  if (writeError) return writeError

  let body: {
    expenseId?: string
    paidByParticipantId?: string
    amount?: number
    description?: string
    date?: string
    categoryId?: string | null
    shareParticipantIds?: string[]
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
  }

  if (!body.expenseId) {
    return NextResponse.json(
      { error: 'expenseId ist erforderlich' },
      { status: 400 }
    )
  }

  const existing = await prisma.splitExpense.findFirst({
    where: { id: body.expenseId, splitListId: id },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Ausgabe nicht gefunden' }, { status: 404 })
  }

  const validated = await validateExpenseInput(id, body)
  if (validated instanceof NextResponse) return validated

  const expense = await prisma.$transaction(async (tx) => {
    await tx.splitExpenseShare.deleteMany({ where: { expenseId: existing.id } })

    return tx.splitExpense.update({
      where: { id: existing.id },
      data: {
        paidByParticipantId: body.paidByParticipantId!,
        categoryId: body.categoryId ?? null,
        amount: validated.amount,
        description: validated.description,
        date: validated.date,
        shares: {
          create: validated.shareIds.map((participantId) => ({ participantId })),
        },
      },
      include: {
        paidBy: true,
        category: true,
        shares: { select: { participantId: true } },
      },
    })
  })

  return NextResponse.json(serializeExpense(expense))
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const access = await requireSplitListAccess(authResult.user.id, id)
  if (access instanceof NextResponse) return access

  const writeError = requireSplitListWrite(access)
  if (writeError) return writeError

  let body: { expenseId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
  }

  if (!body.expenseId) {
    return NextResponse.json(
      { error: 'expenseId ist erforderlich' },
      { status: 400 }
    )
  }

  const existing = await prisma.splitExpense.findFirst({
    where: { id: body.expenseId, splitListId: id },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Ausgabe nicht gefunden' }, { status: 404 })
  }

  await prisma.splitExpense.delete({ where: { id: existing.id } })

  return NextResponse.json({ message: 'Ausgabe gelöscht' })
}
