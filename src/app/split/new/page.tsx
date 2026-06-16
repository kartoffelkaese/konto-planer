'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PageContextHeader from '@/components/PageContextHeader'
import SplitPageShell from '@/components/split/SplitPageShell'
import { Button } from '@/components/Button'
import { createSplitList } from '@/lib/api'
import { DEFAULT_SPLIT_CATEGORIES } from '@/lib/splitBalances'
import {
  splitHintClass,
  splitInputClass,
  splitLabelClass,
  splitSectionCardClass,
} from '@/components/split/splitUiClasses'

export default function SplitNewPage() {
  const router = useRouter()
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
      router.push(`/split/${list.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Anlegen')
      setLoading(false)
    }
  }

  return (
    <SplitPageShell narrow>
      <PageContextHeader
        title="Neue Split-Liste"
        subtitle="Urlaub, WG oder jedes gemeinsame Event"
      />

      <form onSubmit={handleSubmit} className={`${splitSectionCardClass} space-y-6`}>
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
            Sie werden automatisch mit Ihrem Namen aus den Kontoeinstellungen
            (Absendername oder Kontobezeichnung) hinzugefügt. Standard-Kategorien:
            Essen, Transport, Unterkunft, Sonstiges.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-danger-subtle text-danger rounded-control border border-danger/20 text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={loading} loadingText="Wird angelegt…">
            Liste anlegen
          </Button>
          <Link href="/split">
            <Button type="button" variant="secondary">
              Abbrechen
            </Button>
          </Link>
        </div>
      </form>
    </SplitPageShell>
  )
}
