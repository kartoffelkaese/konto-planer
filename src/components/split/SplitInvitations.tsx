'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/Button'
import type { SplitInviteReceived } from '@/types/split'
import { getSplitInvitesReceived, respondToSplitInvite } from '@/lib/api'

type SplitInvitationsProps = {
  onResponded?: () => void
}

export default function SplitInvitations({ onResponded }: SplitInvitationsProps) {
  const [invites, setInvites] = useState<SplitInviteReceived[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await getSplitInvitesReceived()
      setInvites(data)
    } catch {
      // optional
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleAction = async (id: string, action: 'accept' | 'decline') => {
    setActingId(id)
    setError(null)
    try {
      await respondToSplitInvite(id, action)
      await load()
      onResponded?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler')
    } finally {
      setActingId(null)
    }
  }

  if (loading || invites.length === 0) return null

  return (
    <div className="mb-6 rounded-lg border border-accent-border bg-accent-subtle p-4">
      <h2 className="text-lg font-medium text-primary mb-1">Einladungen zu Split-Listen</h2>
      <p className="text-sm text-secondary mb-4">
        Sie wurden eingeladen, Ausgaben in einer Split-Liste mitzuerfassen. Dies ist
        unabhängig von geteilten Haushaltskonten.
      </p>
      <ul className="space-y-3">
        {invites.map((invite) => (
          <li
            key={invite.id}
            className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-control border border-border bg-surface p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-primary truncate">{invite.splitListName}</p>
              <p className="text-sm text-secondary truncate">
                Eingeladen von {invite.invitedByEmail}
                {invite.participantDisplayName &&
                  ` · als „${invite.participantDisplayName}"`}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={actingId !== null}
                onClick={() => handleAction(invite.id, 'decline')}
              >
                Ablehnen
              </Button>
              <Button
                type="button"
                size="sm"
                loading={actingId === invite.id}
                loadingText="…"
                disabled={actingId !== null && actingId !== invite.id}
                onClick={() => handleAction(invite.id, 'accept')}
              >
                Annehmen
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  )
}
