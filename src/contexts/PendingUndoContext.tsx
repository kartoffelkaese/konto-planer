'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { useSession } from 'next-auth/react'
import Modal from '@/components/Modal'
import { Button } from '@/components/Button'
import { useToast } from '@/contexts/ToastContext'
import { getApiErrorMessage, undoPendingInstances } from '@/lib/api'
import { ACCOUNT_CHANGED_EVENT } from '@/lib/accountSwitchEvents'
import { formatDate } from '@/lib/dateUtils'
import { formatCurrency } from '@/lib/formatters'
import {
  buildPendingUndoEntry,
  parsePendingUndoEntry,
  readPendingUndoRaw,
  storePendingUndoEntry,
  subscribePendingUndo,
  type PendingUndoChangedItem,
  type PendingUndoMode,
} from '@/lib/pendingUndo'
import type { Transaction } from '@/types'

const MAX_LISTED_CHANGES = 5

type PendingConfirmation = {
  changed: PendingUndoChangedItem[]
  unchangedCount: number
}

interface PendingUndoContextValue {
  /** Anzahl der Buchungen aus dem letzten Durchlauf, die sich zurücknehmen lassen (0 = nichts) */
  undoCount: number
  isUndoing: boolean
  /** Nach „Ausstehende erstellen“ aufrufen; zeigt die Erfolgsmeldung samt „Rückgängig“ */
  registerCreated: (created: Transaction[]) => void
  requestUndo: () => void
  /** Wird nach erfolgreichem Zurücknehmen aufgerufen, damit Seiten ihre Listen neu laden */
  subscribeUndone: (listener: () => void) => () => void
}

const PendingUndoContext = createContext<PendingUndoContextValue | null>(null)

function paymentCount(count: number): string {
  return count === 1 ? '1 ausstehende Zahlung' : `${count} ausstehende Zahlungen`
}

export function PendingUndoProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast()
  const raw = useSyncExternalStore(subscribePendingUndo, readPendingUndoRaw, () => null)
  const entry = useMemo(() => parsePendingUndoEntry(raw), [raw])
  const [isUndoing, setIsUndoing] = useState(false)
  const [confirmation, setConfirmation] = useState<PendingConfirmation | null>(null)
  const listeners = useRef(new Set<() => void>())

  // Der Eintrag gehört zum Konto, in dem er entstanden ist – nach einem Kontowechsel verfällt er
  useEffect(() => {
    const clear = () => storePendingUndoEntry(null)
    window.addEventListener(ACCOUNT_CHANGED_EVENT, clear)
    return () => window.removeEventListener(ACCOUNT_CHANGED_EVENT, clear)
  }, [])

  // Abgemeldet: nichts für die nächste Anmeldung im selben Tab übrig lassen
  const { status } = useSession()
  useEffect(() => {
    if (status === 'unauthenticated' && readPendingUndoRaw() !== null) storePendingUndoEntry(null)
  }, [status])

  const subscribeUndone = useCallback((listener: () => void) => {
    listeners.current.add(listener)
    return () => {
      listeners.current.delete(listener)
    }
  }, [])

  const runUndo = useCallback(
    async (mode: PendingUndoMode) => {
      const current = parsePendingUndoEntry(readPendingUndoRaw())
      if (!current) return

      setIsUndoing(true)
      try {
        const result = await undoPendingInstances(current.items, mode)
        if (result.status === 'needs-confirmation') {
          setConfirmation({ changed: result.changed, unchangedCount: result.unchangedCount })
          return
        }

        setConfirmation(null)
        storePendingUndoEntry(null)
        listeners.current.forEach((listener) => listener())

        if (result.deleted === 0) {
          showToast('Keine Zahlungen entfernt', 'warning')
        } else if (result.kept > 0) {
          showToast(`${paymentCount(result.deleted)} entfernt, ${result.kept} behalten`, 'success')
        } else {
          showToast(`${paymentCount(result.deleted)} entfernt`, 'success')
        }
      } catch (error) {
        showToast(getApiErrorMessage(error, 'Rückgängig machen fehlgeschlagen'), 'error')
      } finally {
        setIsUndoing(false)
      }
    },
    [showToast]
  )

  const requestUndo = useCallback(() => {
    void runUndo('ask')
  }, [runUndo])

  const registerCreated = useCallback(
    (created: Transaction[]) => {
      const next = buildPendingUndoEntry(created)
      if (!next) {
        // Nichts Neues entstanden: der vorherige Durchlauf bleibt rücknehmbar
        showToast('Keine neuen ausstehenden Zahlungen fällig', 'success')
        return
      }
      storePendingUndoEntry(next)
      showToast(`${paymentCount(created.length)} erstellt`, 'success', {
        label: 'Rückgängig',
        onClick: requestUndo,
      })
    },
    [requestUndo, showToast]
  )

  const value = useMemo(
    () => ({
      undoCount: entry?.items.length ?? 0,
      isUndoing,
      registerCreated,
      requestUndo,
      subscribeUndone,
    }),
    [entry, isUndoing, registerCreated, requestUndo, subscribeUndone]
  )

  const changedCount = confirmation?.changed.length ?? 0
  const hiddenChanges = Math.max(0, changedCount - MAX_LISTED_CHANGES)

  return (
    <PendingUndoContext.Provider value={value}>
      {children}
      <Modal
        isOpen={confirmation !== null}
        onClose={() => setConfirmation(null)}
        title="Geänderte Buchungen"
        maxWidth="md"
        preventClose={isUndoing}
      >
        <p className="text-sm text-secondary">
          {changedCount === 1
            ? 'Eine der erstellten Buchungen wurde inzwischen bearbeitet oder bestätigt:'
            : `${changedCount} der erstellten Buchungen wurden inzwischen bearbeitet oder bestätigt:`}
        </p>
        <ul className="mt-3 divide-y divide-hairline rounded-control bg-surface-muted px-3">
          {confirmation?.changed.slice(0, MAX_LISTED_CHANGES).map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="min-w-0">
                <span className="block truncate font-medium text-primary">{item.merchant}</span>
                <span className="block text-xs text-secondary">
                  {formatDate(item.date)}
                  {item.isConfirmed ? ' · bestätigt' : ' · bearbeitet'}
                </span>
              </span>
              <span className="amount shrink-0 text-primary">{formatCurrency(item.amount)}</span>
            </li>
          ))}
          {hiddenChanges > 0 && (
            <li className="py-2 text-xs text-secondary">und {hiddenChanges} weitere</li>
          )}
        </ul>
        <div className="mt-5 flex flex-col gap-2">
          {confirmation !== null && confirmation.unchangedCount > 0 && (
            <Button
              type="button"
              fullWidth
              loading={isUndoing}
              onClick={() => void runUndo('unchanged')}
            >
              Nur unveränderte entfernen ({confirmation.unchangedCount})
            </Button>
          )}
          <Button
            type="button"
            variant="danger"
            fullWidth
            disabled={isUndoing}
            onClick={() => void runUndo('all')}
          >
            Alle entfernen
          </Button>
          <Button
            type="button"
            variant="ghost"
            fullWidth
            disabled={isUndoing}
            onClick={() => setConfirmation(null)}
          >
            Abbrechen
          </Button>
        </div>
      </Modal>
    </PendingUndoContext.Provider>
  )
}

/** Zugriff auf „Rückgängig“ für „Ausstehende erstellen“; `onUndone` lädt die Seite danach neu */
export function usePendingUndo(onUndone?: () => void): PendingUndoContextValue {
  const context = useContext(PendingUndoContext)
  if (!context) {
    throw new Error('usePendingUndo muss innerhalb von PendingUndoProvider verwendet werden')
  }

  const onUndoneRef = useRef(onUndone)
  useEffect(() => {
    onUndoneRef.current = onUndone
  })

  const { subscribeUndone } = context
  useEffect(() => subscribeUndone(() => onUndoneRef.current?.()), [subscribeUndone])

  return context
}
