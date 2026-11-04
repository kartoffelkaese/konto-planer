'use client'

import { useState } from 'react'
import { Button } from '@/components/Button'
import ConfirmDialog from '@/components/ConfirmDialog'
import type { SplitListDetail } from '@/types/split'
import { splitSectionCardClass } from '@/components/split/splitUiClasses'

type ManageAction = 'archive' | 'unarchive' | 'delete'

export type SplitListManageHandlers = {
  /** Archivieren ist nur bei bearbeitbaren Listen möglich */
  canArchive: boolean
  onArchive: () => Promise<void>
  onUnarchive: () => Promise<void>
  onDelete: () => Promise<void>
}

type SplitListManageSectionProps = SplitListManageHandlers & {
  list: SplitListDetail
}

/** Einstellungen → „Liste verwalten“ (nur Ersteller): archivieren, reaktivieren, löschen */
export default function SplitListManageSection({
  list,
  canArchive,
  onArchive,
  onUnarchive,
  onDelete,
}: SplitListManageSectionProps) {
  const [open, setOpen] = useState(false)
  // Bleibt beim Schließen stehen, damit der Dialog nicht leer ausblendet
  const [action, setAction] = useState<ManageAction>('delete')
  const ask = (next: ManageAction) => {
    setAction(next)
    setOpen(true)
  }
  const isArchived = list.status === 'ARCHIVED'

  const dialogs: Record<
    ManageAction,
    {
      title: string
      message: string
      confirmText: string
      confirmLoadingText: string
      type: 'danger' | 'warning' | 'info'
      run: () => Promise<void>
    }
  > = {
    archive: {
      title: 'Liste archivieren?',
      message: `„${list.name}“ bleibt lesbar, aber es können keine neuen Ausgaben mehr erfasst werden.`,
      confirmText: 'Archivieren',
      confirmLoadingText: 'Wird archiviert…',
      type: 'warning',
      run: onArchive,
    },
    unarchive: {
      title: 'Liste reaktivieren?',
      message: `Ausgaben und Einstellungen von „${list.name}“ können dann wieder bearbeitet werden.`,
      confirmText: 'Reaktivieren',
      confirmLoadingText: 'Wird reaktiviert…',
      type: 'info',
      run: onUnarchive,
    },
    delete: {
      title: 'Liste endgültig löschen?',
      message: `Alle Ausgaben, Salden und Teilnehmer von „${list.name}“ werden unwiderruflich entfernt.`,
      confirmText: 'Endgültig löschen',
      confirmLoadingText: 'Wird gelöscht…',
      type: 'danger',
      run: onDelete,
    },
  }
  const dialog = dialogs[action]

  return (
    <section className={`${splitSectionCardClass} space-y-4`}>
      <h3 className="text-base font-medium text-primary">Liste verwalten</h3>

      <div className="divide-y divide-hairline">
        {(canArchive || isArchived) && (
          <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-primary">
                {isArchived ? 'Reaktivieren' : 'Archivieren'}
              </p>
              <p className="mt-0.5 text-xs text-secondary">
                {isArchived
                  ? 'Macht die Liste wieder bearbeitbar.'
                  : 'Die Liste bleibt lesbar, neue Ausgaben sind nicht mehr möglich.'}
              </p>
            </div>
            <Button
              variant="secondary"
              className="shrink-0"
              onClick={() => ask(isArchived ? 'unarchive' : 'archive')}
            >
              {isArchived ? 'Reaktivieren' : 'Archivieren'}
            </Button>
          </div>
        )}

        <div className="flex flex-col gap-3 pt-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-primary">Löschen</p>
            <p className="mt-0.5 text-xs text-secondary">
              Entfernt die Liste mit allen Ausgaben, Salden und Teilnehmern.
            </p>
          </div>
          <Button variant="danger-outline" className="shrink-0" onClick={() => ask('delete')}>
            Löschen
          </Button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={dialog.run}
        title={dialog.title}
        message={dialog.message}
        confirmText={dialog.confirmText}
        confirmLoadingText={dialog.confirmLoadingText}
        type={dialog.type}
      />
    </section>
  )
}
