'use client'

import { ArrowUturnLeftIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/Button'
import { usePendingUndo } from '@/contexts/PendingUndoContext'

/** „Rückgängig“ für automatisch eingetragene Zahlungen – nur sichtbar, solange der letzte Durchlauf rücknehmbar ist */
export default function PendingUndoButton({ onUndone }: { onUndone: () => void }) {
  const { undoCount, isUndoing, requestUndo } = usePendingUndo(onUndone)

  if (undoCount === 0) return null

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={requestUndo}
      loading={isUndoing}
      loadingText="Wird entfernt…"
      title={`Entfernt die ${undoCount} zuletzt automatisch eingetragenen Zahlungen wieder`}
      aria-label={`Automatisch eingetragene Zahlungen entfernen (${undoCount} Buchungen)`}
    >
      <ArrowUturnLeftIcon className="h-5 w-5" aria-hidden="true" />
      Rückgängig
    </Button>
  )
}
