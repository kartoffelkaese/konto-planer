'use client'

import { useState } from 'react'
import {
  EnvelopeIcon,
  ExclamationCircleIcon,
  PlusIcon,
  UserGroupIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@/components/Button'
import { useToast } from '@/hooks/useToast'
import type { SplitParticipant } from '@/types/split'
import { addSplitParticipant, removeSplitParticipant } from '@/lib/api'
import { getParticipantInitials } from '@/components/split/splitParticipantUtils'
import {
  splitHintClass,
  splitInputClass,
  splitLabelClass,
  splitSectionCardClass,
} from '@/components/split/splitUiClasses'

function formatParticipantRemoveError(message: string, displayName?: string): string {
  if (message.includes('Ausgaben verknüpft')) {
    const who = displayName ? `„${displayName}"` : 'Dieser Teilnehmer'
    return `${who} kann nicht entfernt werden, weil noch Ausgaben damit verknüpft sind. Bearbeiten oder löschen Sie zuerst die betroffenen Posten im Tab „Ausgaben“.`
  }
  return message
}

function ParticipantStatusBadge({ participant }: { participant: SplitParticipant }) {
  if (participant.pendingInvite) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-pending/30 bg-pending-bg px-2 py-0.5 text-[11px] font-medium text-pending">
        <EnvelopeIcon className="h-3 w-3" aria-hidden="true" />
        Einladung offen
      </span>
    )
  }
  if (participant.userId) {
    return (
      <span className="inline-flex items-center rounded-full border border-income/30 bg-income-bg px-2 py-0.5 text-[11px] font-medium text-income">
        Mit Konto
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-secondary">
      Fiktiv
    </span>
  )
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
  const [showAddForm, setShowAddForm] = useState(false)
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
      setShowAddForm(false)
      showToast(
        mail ? `Einladung an ${mail} versendet` : `„${participant.displayName}" hinzugefügt`,
        'success'
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Teilnehmer konnte nicht hinzugefügt werden'
      setError(message)
      showToast(message, 'error')
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
    <section className={`${splitSectionCardClass} overflow-hidden p-0`}>
      <header className="flex items-start gap-3 border-b border-accent-border bg-accent-subtle px-4 py-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-accent-border bg-surface text-accent">
          <UserGroupIcon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-medium text-primary">Teilnehmer</h3>
          <p className="text-xs text-secondary">
            {participants.length === 1 ? '1 Person' : `${participants.length} Personen`} in dieser
            Liste
          </p>
        </div>
      </header>

      {error && (
        <div
          className="mx-4 mt-4 flex items-start gap-3 rounded-card border border-danger/20 bg-danger-subtle px-3 py-2.5 text-sm text-danger"
          role="alert"
        >
          <ExclamationCircleIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}

      <ul className="divide-y divide-border bg-canvas">
        {participants.map((participant) => (
          <li
            key={participant.id}
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-muted"
          >
            <span
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent-border bg-accent-subtle text-sm font-semibold text-accent"
              aria-hidden="true"
            >
              {getParticipantInitials(participant.displayName) || '?'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-primary">{participant.displayName}</p>
              <div className="mt-1">
                <ParticipantStatusBadge participant={participant} />
              </div>
            </div>
            {canManage && participants.length > 1 && (
              <Button
                size="sm"
                variant="danger-outline"
                onClick={() => handleRemove(participant.id)}
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
        <div className="border-t border-border bg-surface px-4 py-3">
          {!showAddForm ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setError(null)
                setShowAddForm(true)
              }}
            >
              <PlusIcon className="h-4 w-4" aria-hidden="true" />
              Teilnehmer hinzufügen
            </Button>
          ) : (
            <div className="space-y-4">
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
                <UserIcon className="inline h-4 w-4 -mt-0.5 mr-1" aria-hidden="true" />
                Mit E-Mail wird ein konto-planer-Nutzer eingeladen. Ohne E-Mail bleibt die Person
                fiktiv (nur Name in der Liste).
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleAdd}
                  disabled={loading || (!displayName.trim() && !email.trim())}
                  size="sm"
                >
                  Hinzufügen
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setShowAddForm(false)
                    setDisplayName('')
                    setEmail('')
                    setError(null)
                  }}
                >
                  Abbrechen
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
