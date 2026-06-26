'use client'

import { useState } from 'react'
import { Button } from '@/components/Button'
import { createSplitList } from '@/lib/api'
import { DEFAULT_SPLIT_CATEGORIES } from '@/lib/splitBalances'
import type { SplitListSummary } from '@/types/split'
import {
  splitHintClass,
  splitInputClass,
  splitLabelClass,
} from '@/components/split/splitUiClasses'

type SplitListFormProps = {
  onSaved: (list: SplitListSummary) => void | Promise<void>
  onCancel?: () => void
}

export default function SplitListForm({ onSaved, onCancel }: SplitListFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [participantInput, setParticipantInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Name ist erforderlich')
      return
    }

    const participantNames = participantInput
      .split(/[\n,;]+/)
      .map((n) => n.trim())
      .filter(Boolean)

    setLoading(true)
    setError(null)
    try {
      const list = await createSplitList({
        name: trimmedName,
        description: description.trim() || undefined,
        participantNames,
        categoryNames: DEFAULT_SPLIT_CATEGORIES.map((c) => c.name),
      })
      await onSaved(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Anlegen')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="split-list-name" className={splitLabelClass}>
          Name
        </label>
        <input
          id="split-list-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="z. B. Urlaub 2025"
          className={`mt-1 ${splitInputClass}`}
        />
      </div>

      <div>
        <label htmlFor="split-list-desc" className={splitLabelClass}>
          Beschreibung (optional)
        </label>
        <textarea
          id="split-list-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className={`mt-1 ${splitInputClass}`}
        />
      </div>

      <div>
        <label htmlFor="split-participants" className={splitLabelClass}>
          Weitere Teilnehmer (optional)
        </label>
        <textarea
          id="split-participants"
          value={participantInput}
          onChange={(e) => setParticipantInput(e.target.value)}
          rows={3}
          placeholder="Namen durch Komma oder Zeilenumbruch getrennt"
          className={`mt-1 ${splitInputClass}`}
        />
        <p className={splitHintClass}>
          Sie werden automatisch mit Ihrem Split-Anzeigenamen aus den Einstellungen
          (unter Einstellungen → Split & Profil) hinzugefügt. Ohne eigenen Namen
          wird der Absendername des ersten Kontos verwendet. Standard-Kategorien:
          Essen, Transport, Unterkunft, Sonstiges.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-danger-subtle text-danger rounded-control border border-danger/20 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap">
        <Button type="submit" loading={loading} loadingText="Wird angelegt…" className="w-full sm:w-auto">
          Liste anlegen
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} className="w-full sm:w-auto">
            Abbrechen
          </Button>
        )}
      </div>
    </form>
  )
}
