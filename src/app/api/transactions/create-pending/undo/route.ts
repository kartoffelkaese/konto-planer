import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAccountContext, requireWritableContext } from '@/lib/account-context'
import { isErrorResponse, readJsonBody } from '@/lib/api-auth'
import { logger } from '@/lib/logger'
import {
  MAX_PENDING_UNDO_ITEMS,
  PENDING_UNDO_MODES,
  type PendingUndoItem,
  type PendingUndoMode,
} from '@/lib/pendingUndo'

type UndoBody = {
  items?: unknown
  mode?: unknown
}

function invalidRequest() {
  return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
}

function validateItems(value: unknown): PendingUndoItem[] | NextResponse {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_PENDING_UNDO_ITEMS) {
    return invalidRequest()
  }

  const items: PendingUndoItem[] = []
  for (const raw of value) {
    if (typeof raw !== 'object' || raw === null) return invalidRequest()
    const { id, merchant, description, amount, date, categoryId } = raw as Record<string, unknown>
    if (
      typeof id !== 'string' ||
      typeof merchant !== 'string' ||
      (description !== null && typeof description !== 'string') ||
      typeof amount !== 'number' ||
      !Number.isFinite(amount) ||
      typeof date !== 'string' ||
      Number.isNaN(new Date(date).getTime()) ||
      (categoryId !== null && typeof categoryId !== 'string')
    ) {
      return invalidRequest()
    }
    items.push({ id, merchant, description, amount, date, categoryId })
  }
  return items
}

function validateMode(value: unknown): PendingUndoMode | NextResponse {
  if (value === undefined) return 'ask'
  const mode = PENDING_UNDO_MODES.find((candidate) => candidate === value)
  return mode ?? invalidRequest()
}

/**
 * Nimmt per „Ausstehende erstellen“ angelegte Instanzen zurück.
 * Der Client schickt den Stand direkt nach dem Erstellen mit; weicht eine Buchung davon ab
 * (bearbeitet oder bestätigt), wird im Modus `ask` nichts gelöscht, sondern nachgefragt.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getAccountContext()
    if (isErrorResponse(ctx)) return ctx

    const writeError = requireWritableContext(ctx)
    if (writeError) return writeError

    const body = await readJsonBody<UndoBody>(request)
    if (isErrorResponse(body)) return body

    const items = validateItems(body.items)
    if (isErrorResponse(items)) return items

    const mode = validateMode(body.mode)
    if (isErrorResponse(mode)) return mode

    const { account } = ctx
    const snapshots = new Map(items.map((item) => [item.id, item]))

    // Nur Instanzen wiederkehrender Zahlungen des aktiven Kontos – nie Vorlagen oder freie Buchungen
    const existing = await prisma.transaction.findMany({
      where: {
        id: { in: [...snapshots.keys()] },
        accountId: account.id,
        isRecurring: false,
        parentTransactionId: { not: null },
      },
      include: {
        transferPairAsSource: { select: { targetTransactionId: true } },
      },
    })

    const changed = existing.filter((transaction) => {
      const snapshot = snapshots.get(transaction.id)
      if (!snapshot) return true
      return (
        transaction.isConfirmed ||
        transaction.merchant !== snapshot.merchant ||
        transaction.description !== snapshot.description ||
        transaction.categoryId !== snapshot.categoryId ||
        Math.abs(Number(transaction.amount) - snapshot.amount) > 0.001 ||
        transaction.date.getTime() !== new Date(snapshot.date).getTime()
      )
    })

    if (mode === 'ask' && changed.length > 0) {
      return NextResponse.json({
        status: 'needs-confirmation',
        unchangedCount: existing.length - changed.length,
        changed: changed.map((transaction) => ({
          id: transaction.id,
          merchant: transaction.merchant,
          amount: Number(transaction.amount),
          date: transaction.date.toISOString(),
          isConfirmed: transaction.isConfirmed,
        })),
      })
    }

    const changedIds = new Set(changed.map((transaction) => transaction.id))
    const toDelete =
      mode === 'unchanged'
        ? existing.filter((transaction) => !changedIds.has(transaction.id))
        : existing

    const sourceIds = toDelete.map((transaction) => transaction.id)
    // Gegenbuchungen im Zielkonto, die beim Erstellen der Umbuchung mit angelegt wurden
    const targetIds = toDelete
      .map((transaction) => transaction.transferPairAsSource?.targetTransactionId)
      .filter((id): id is string => typeof id === 'string')

    if (sourceIds.length > 0) {
      await prisma.$transaction(async (tx) => {
        if (targetIds.length > 0) {
          await tx.transaction.deleteMany({ where: { id: { in: targetIds } } })
        }
        await tx.transaction.deleteMany({
          where: { id: { in: sourceIds }, accountId: account.id },
        })
      })
    }

    return NextResponse.json({
      status: 'done',
      deleted: sourceIds.length,
      kept: existing.length - sourceIds.length,
    })
  } catch (error) {
    logger.error('Error undoing pending transactions', error, {
      endpoint: '/api/transactions/create-pending/undo',
    })
    return NextResponse.json(
      { error: 'Fehler beim Zurücknehmen der ausstehenden Zahlungen' },
      { status: 500 }
    )
  }
}
