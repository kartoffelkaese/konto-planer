'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/useToast'
import { Button } from '@/components/Button'
import ConfirmDialog from '@/components/ConfirmDialog'
import {
  ACCOUNT_SWITCH_EXIT_MS,
  dispatchAccountChanged,
  dispatchAccountSwitching,
} from '@/lib/accountSwitchEvents'

type ReceivedInvite = {
  id: string
  accountId: string
  accountName: string
  invitedByEmail: string
  createdAt: string
}

export default function AccountInvitations() {
  const router = useRouter()
  const { update } = useSession()
  const { showToast } = useToast()
  const [invites, setInvites] = useState<ReceivedInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)
  const [declineTarget, setDeclineTarget] = useState<ReceivedInvite | null>(null)

  const loadInvites = useCallback(async () => {
    try {
      const res = await fetch('/api/invites/received')
      if (!res.ok) return
      const data = await res.json()
      setInvites(Array.isArray(data) ? data : [])
    } catch {
      // optional
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadInvites()
  }, [loadInvites])

  useEffect(() => {
    const onAccountChanged = () => loadInvites()
    window.addEventListener('account-changed', onAccountChanged)
    window.addEventListener('focus', onAccountChanged)
    return () => {
      window.removeEventListener('account-changed', onAccountChanged)
      window.removeEventListener('focus', onAccountChanged)
    }
  }, [loadInvites])

  const respond = async (inviteId: string, action: 'accept' | 'decline') => {
    setActingId(inviteId)
    try {
      const res = await fetch(`/api/invites/${inviteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Aktion fehlgeschlagen')
      }

      if (action === 'accept') {
        showToast(
          data.message === 'Einladung angenommen'
            ? `Zugriff auf „${data.accountName}" freigeschaltet`
            : data.message,
          'success'
        )
        if (data.accountId) {
          dispatchAccountSwitching()
          await new Promise((resolve) => setTimeout(resolve, ACCOUNT_SWITCH_EXIT_MS))
          await fetch('/api/accounts/active', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId: data.accountId }),
          })
          await update({ activeAccountId: data.accountId })
          router.refresh()
        }
      } else {
        showToast(
          data.accountName
            ? `Einladung zu „${data.accountName}" abgelehnt`
            : 'Einladung abgelehnt',
          'success'
        )
      }

      await loadInvites()
      dispatchAccountChanged()
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Aktion fehlgeschlagen',
        'error'
      )
    } finally {
      setActingId(null)
      setDeclineTarget(null)
    }
  }

  if (loading) {
    return null
  }

  if (invites.length === 0) {
    return null
  }

  return (
    <>
      <div className="rounded-lg border border-accent-border bg-accent-subtle p-4">
        <h2 className="text-lg font-medium text-primary mb-1">
          Einladungen zu geteilten Konten
        </h2>
        <p className="text-sm text-secondary mb-4">
          Sie wurden eingeladen, ein Buchführungs-Konto mitzunutzen. Nach der
          Annahme erscheint es im Kontowechsel in der Navigation.
        </p>
        <ul className="space-y-3">
          {invites.map((invite) => (
            <li
              key={invite.id}
              className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-control border border-border bg-surface p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-primary truncate">
                  {invite.accountName}
                </p>
                <p className="text-sm text-secondary truncate">
                  Eingeladen von {invite.invitedByEmail}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={actingId !== null}
                  onClick={() => setDeclineTarget(invite)}
                >
                  Ablehnen
                </Button>
                <Button
                  type="button"
                  size="sm"
                  loading={actingId === invite.id}
                  loadingText="…"
                  disabled={actingId !== null && actingId !== invite.id}
                  onClick={() => respond(invite.id, 'accept')}
                >
                  Annehmen
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <ConfirmDialog
        isOpen={declineTarget !== null}
        onClose={() => setDeclineTarget(null)}
        onConfirm={async () => {
          if (!declineTarget) return
          await respond(declineTarget.id, 'decline')
        }}
        title="Einladung ablehnen?"
        message={
          declineTarget
            ? `Möchten Sie die Einladung zum Konto „${declineTarget.accountName}" ablehnen? Sie können später erneut eingeladen werden.`
            : ''
        }
        confirmText="Ablehnen"
        cancelText="Abbrechen"
        type="warning"
      />
    </>
  )
}
