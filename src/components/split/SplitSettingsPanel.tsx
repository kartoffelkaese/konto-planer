'use client'

import { useEffect, useState } from 'react'
import { Cog6ToothIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/Button'
import { useToast } from '@/hooks/useToast'
import { updateSplitList } from '@/lib/api'
import type { SplitListDetail } from '@/types/split'
import SplitParticipantList from '@/components/split/SplitParticipantList'
import SplitCategoryManager from '@/components/split/SplitCategoryManager'
import SplitSharePanel from '@/components/split/SplitSharePanel'
import {
  splitInputClass,
  splitLabelClass,
  splitSectionCardClass,
} from '@/components/split/splitUiClasses'

type SplitSettingsPanelProps = {
  listId: string
  list: SplitListDetail
  readOnly: boolean
  isOwner: boolean
  onListChange: (list: SplitListDetail) => void
}

function SplitListDetailsForm({
  listId,
  list,
  readOnly,
  isOwner,
  onListChange,
}: SplitSettingsPanelProps) {
  const { showToast } = useToast()
  const [name, setName] = useState(list.name)
  const [description, setDescription] = useState(list.description ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(list.name)
    setDescription(list.description ?? '')
  }, [list.name, list.description])

  const isDirty =
    name.trim() !== list.name || (description.trim() || null) !== (list.description ?? null)

  if (!isOwner) {
    return (
      <section className={`${splitSectionCardClass} space-y-2`}>
        <h3 className="text-base font-medium text-primary">Listen-Details</h3>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-secondary">Name</dt>
            <dd className="font-medium text-primary">{list.name}</dd>
          </div>
          <div>
            <dt className="text-secondary">Status</dt>
            <dd className="font-medium text-primary">
              {list.status === 'ARCHIVED' ? 'Archiviert' : 'Aktiv'}
            </dd>
          </div>
          {list.description && (
            <div className="sm:col-span-2">
              <dt className="text-secondary">Beschreibung</dt>
              <dd className="text-primary">{list.description}</dd>
            </div>
          )}
        </dl>
      </section>
    )
  }

  const handleSave = async () => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Name ist erforderlich')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const updated = await updateSplitList(listId, {
        name: trimmedName,
        description: description.trim() || null,
      })
      onListChange({ ...list, ...updated })
      showToast('Listen-Details gespeichert', 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Speichern fehlgeschlagen'
      setError(message)
      showToast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className={`${splitSectionCardClass} space-y-4`}>
      <div>
        <h3 className="text-base font-medium text-primary">Listen-Details</h3>
        <p className="text-xs text-secondary mt-0.5">
          Name und Beschreibung für alle Teilnehmer sichtbar
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="split-settings-name" className={splitLabelClass}>
            Name
          </label>
          <input
            id="split-settings-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={readOnly}
            className={`mt-1 ${splitInputClass}`}
          />
        </div>
        <div>
          <label htmlFor="split-settings-description" className={splitLabelClass}>
            Beschreibung (optional)
          </label>
          <textarea
            id="split-settings-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={readOnly}
            rows={2}
            placeholder="z. B. Sommerurlaub in Italien"
            className={`mt-1 ${splitInputClass}`}
          />
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {!readOnly && isDirty && (
        <Button onClick={handleSave} loading={saving} loadingText="Speichern…" size="sm">
          Änderungen speichern
        </Button>
      )}
    </section>
  )
}

export default function SplitSettingsPanel({
  listId,
  list,
  readOnly,
  isOwner,
  onListChange,
}: SplitSettingsPanelProps) {
  const pendingInvites = list.participants.filter((participant) => participant.pendingInvite).length
  const withAccount = list.participants.filter(
    (participant) => participant.userId && !participant.pendingInvite
  ).length

  return (
    <div className="space-y-6">
      <div className={`${splitSectionCardClass} flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4`}>
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-accent-border bg-accent-subtle text-accent">
            <Cog6ToothIcon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-medium text-primary">Einstellungen</p>
            <p className="text-xs text-secondary">
              {list.participants.length}{' '}
              {list.participants.length === 1 ? 'Teilnehmer' : 'Teilnehmer'}
              {' · '}
              {list.categories.length}{' '}
              {list.categories.length === 1 ? 'Kategorie' : 'Kategorien'}
              {list.status === 'ARCHIVED' && ' · archiviert'}
            </p>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:flex sm:flex-wrap sm:gap-x-6 sm:gap-y-1">
          <div>
            <dt className="text-xs text-secondary">Mit Konto</dt>
            <dd className="font-medium tabular-nums text-primary">{withAccount}</dd>
          </div>
          {pendingInvites > 0 && (
            <div>
              <dt className="text-xs text-secondary">Einladungen offen</dt>
              <dd className="font-medium tabular-nums text-pending">{pendingInvites}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-secondary">Ihre Rolle</dt>
            <dd className="font-medium text-primary">
              {list.role === 'OWNER' ? 'Ersteller' : 'Mitglied'}
            </dd>
          </div>
        </dl>
      </div>

      <SplitListDetailsForm
        listId={listId}
        list={list}
        readOnly={readOnly}
        isOwner={isOwner}
        onListChange={onListChange}
      />

      <SplitSharePanel listId={listId} isOwner={isOwner} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SplitParticipantList
          listId={listId}
          participants={list.participants}
          onChange={(participants) => onListChange({ ...list, participants })}
          readOnly={readOnly}
          canManage={isOwner && !readOnly}
        />
        <SplitCategoryManager
          listId={listId}
          categories={list.categories}
          onChange={(categories) => onListChange({ ...list, categories })}
          readOnly={readOnly}
        />
      </div>
    </div>
  )
}
