'use client'

import { ArrowUturnLeftIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/Button'
import { usePendingUndo } from '@/contexts/PendingUndoContext'

/** „Rückgängig“ neben „Ausstehende erstellen“ – nur sichtbar, solange der letzte Durchlauf rücknehmbar ist */
export default function PendingUndoButton({ onUndone }: { onUndone: () => void }) {
  const { undoCount, isUndoing, requestUndo } = usePendingUndo(onUndone)

  if (undoCount === 0) return null

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={requestUndo}
      loading={isUndoing}
      loadingText="Wird entfernt…"
      title={`Entfernt die ${undoCount} zuletzt erstellten ausstehenden Zahlungen wieder`}
      aria-label={`Ausstehende erstellen rückgängig machen (${undoCount} Buchungen)`}
    >
      <ArrowUturnLeftIcon className="h-4 w-4" aria-hidden="true" />
      Rückgängig
    </Button>
  )
}
