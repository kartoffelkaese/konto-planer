/**
 * „Rückgängig“ für „Ausstehende erstellen“: merkt sich den letzten Durchlauf im sessionStorage.
 * Gilt damit nur für den aktuellen Tab – übersteht Neuladen, endet beim Schließen des Tabs.
 */

export const PENDING_UNDO_STORAGE_KEY = 'pendingUndo'
export const PENDING_UNDO_CHANGE_EVENT = 'pending-undo-change'
export const MAX_PENDING_UNDO_ITEMS = 500

/** ask: bei geänderten Buchungen nachfragen · unchanged: geänderte behalten · all: alle entfernen */
export const PENDING_UNDO_MODES = ['ask', 'unchanged', 'all'] as const
export type PendingUndoMode = (typeof PENDING_UNDO_MODES)[number]

/** Stand einer Buchung direkt nach dem Erstellen – daran erkennt der Server spätere Änderungen */
export type PendingUndoItem = {
  id: string
  merchant: string
  description: string | null
  amount: number
  date: string
  categoryId: string | null
}

export type PendingUndoEntry = {
  accountId: string
  items: PendingUndoItem[]
}

export type PendingUndoChangedItem = {
  id: string
  merchant: string
  amount: number
  date: string
  isConfirmed: boolean
}

export type PendingUndoResult =
  | { status: 'needs-confirmation'; unchangedCount: number; changed: PendingUndoChangedItem[] }
  | { status: 'done'; deleted: number; kept: number }

type CreatedTransaction = {
  id: string
  accountId: string
  merchant: string
  description: string | null
  amount: number | string
  date: string
  categoryId?: string | null
}

/** Baut den Rückgängig-Eintrag aus der Antwort von „Ausstehende erstellen“ (null, wenn nichts erstellt wurde) */
export function buildPendingUndoEntry(created: CreatedTransaction[]): PendingUndoEntry | null {
  if (created.length === 0) return null
  return {
    accountId: created[0].accountId,
    items: created.slice(0, MAX_PENDING_UNDO_ITEMS).map((transaction) => ({
      id: transaction.id,
      merchant: transaction.merchant,
      description: transaction.description ?? null,
      amount: Number(transaction.amount),
      date: transaction.date,
      categoryId: transaction.categoryId ?? null,
    })),
  }
}

export function parsePendingUndoEntry(raw: string | null): PendingUndoEntry | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const { accountId, items } = parsed as Partial<PendingUndoEntry>
    if (typeof accountId !== 'string' || !Array.isArray(items) || items.length === 0) return null
    return { accountId, items }
  } catch {
    return null
  }
}

export function readPendingUndoRaw(): string | null {
  try {
    return sessionStorage.getItem(PENDING_UNDO_STORAGE_KEY)
  } catch {
    return null
  }
}

export function storePendingUndoEntry(entry: PendingUndoEntry | null) {
  try {
    if (entry) {
      sessionStorage.setItem(PENDING_UNDO_STORAGE_KEY, JSON.stringify(entry))
    } else {
      sessionStorage.removeItem(PENDING_UNDO_STORAGE_KEY)
    }
  } catch {
    // Speicher nicht verfügbar – dann gibt es schlicht kein Rückgängig
  }
  window.dispatchEvent(new Event(PENDING_UNDO_CHANGE_EVENT))
}

export function subscribePendingUndo(onChange: () => void) {
  window.addEventListener(PENDING_UNDO_CHANGE_EVENT, onChange)
  return () => window.removeEventListener(PENDING_UNDO_CHANGE_EVENT, onChange)
}
