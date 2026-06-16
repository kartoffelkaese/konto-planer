'use client'

import { useState } from 'react'
import { ExclamationCircleIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/Button'
import { useToast } from '@/hooks/useToast'
import type { SplitParticipant } from '@/types/split'
import { addSplitParticipant, removeSplitParticipant } from '@/lib/api'
import {
  splitHintClass,
  splitInputClass,
  splitLabelClass,
  splitListItemClass,
  splitSectionCardClass,
  splitSectionTitleClass,
} from '@/components/split/splitUiClasses'

function formatParticipantRemoveError(message: string, displayName?: string): string {
  if (message.includes('Ausgaben verknüpft')) {
    const who = displayName ? `„${displayName}"` : 'Dieser Teilnehmer'
    return `${who} kann nicht entfernt werden, weil noch Ausgaben damit verknüpft sind. Bearbeiten oder löschen Sie zuerst die betroffenen Posten im Tab „Ausgaben“.`
  }
  return message
}

type SplitParticipantListProps = {
  listId: string
  participants: SplitParticipant[]
  onChange: (participants: SplitParticipant[]) => void
  readOnly?: boolean
  canManage?: boolean
}

export default function SplitParticipantList({
  listId,
  participants,
  onChange,
  readOnly = false,
  canManage = false,
}: SplitParticipantListProps) {
  const { showToast } = useToast()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAdd = async () => {
    const name = displayName.trim()
    const mail = email.trim()
    if (!name && !mail) return
    setLoading(true)
    setError(null)
    try {
      const participant = await addSplitParticipant(listId, {
        displayName: name || mail.split('@')[0] || 'Teilnehmer',
        email: mail || undefined,
      })
      onChange([...participants, participant])
      setDisplayName('')
      setEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (participantId: string) => {
    const participant = participants.find((p) => p.id === participantId)
    if (!confirm(`Teilnehmer „${participant?.displayName ?? 'Unbekannt'}" wirklich entfernen?`)) {
      return
    }
    setLoading(true)
    setError(null)
    try {
      await removeSplitParticipant(listId, participantId)
      onChange(participants.filter((p) => p.id !== participantId))
      showToast('Teilnehmer entfernt', 'success')
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Teilnehmer konnte nicht entfernt werden'
      const friendly = formatParticipantRemoveError(raw, participant?.displayName)
      setError(friendly)
      showToast(friendly, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className={splitSectionCardClass}>
      <h3 className={splitSectionTitleClass}>Teilnehmer</h3>

      {error && (
        <div
          className="mb-4 flex items-start gap-3 rounded-card border border-danger/20 bg-danger-subtle px-4 py-3 text-sm text-danger"
          role="alert"
        >
          <ExclamationCircleIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}

      <ul className="space-y-2 mb-4">
        {participants.map((p) => (
          <li key={p.id} className={splitListItemClass}>
            <div className="min-w-0 flex-1">
              <span className="text-sm font-medium text-primary">{p.displayName}</span>
              {p.pendingInvite && (
                <span className="ml-2 text-xs text-pending">Einladung offen</span>
              )}
              {p.userId && !p.pendingInvite && (
                <span className="ml-2 text-xs text-secondary">Mit Konto</span>
              )}
              {!p.userId && !p.pendingInvite && (
                <span className="ml-2 text-xs text-secondary">Ohne Konto</span>
              )}
            </div>
            {canManage && participants.length > 1 && (
              <Button
                size="sm"
                variant="danger-outline"
                onClick={() => handleRemove(p.id)}
                disabled={loading}
                className="shrink-0"
              >
                Entfernen
              </Button>
            )}
          </li>
        ))}
      </ul>

      {canManage && !readOnly && (
        <div className="space-y-4 border-t border-border pt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="split-participant-name" className={splitLabelClass}>
                Name
              </label>
              <input
                id="split-participant-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Anzeigename"
                className={`mt-1 ${splitInputClass}`}
              />
            </div>
            <div>
              <label htmlFor="split-participant-email" className={splitLabelClass}>
                E-Mail (optional)
              </label>
              <input
                id="split-participant-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="zum Einladen"
                className={`mt-1 ${splitInputClass}`}
              />
            </div>
          </div>
          <p className={splitHintClass}>
            Mit E-Mail wird ein konto-planer-Nutzer eingeladen — der Name kommt aus
            dessen Kontoeinstellungen (Absendername oder Kontobezeichnung). Ohne E-Mail
            bleibt die Person fiktiv.
          </p>
          <Button onClick={handleAdd} disabled={loading || (!displayName.trim() && !email.trim())}>
            Teilnehmer hinzufügen
          </Button>
        </div>
      )}

    </section>
  )
}
