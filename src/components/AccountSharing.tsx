'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useToast } from '@/hooks/useToast'
import { Button } from '@/components/Button'
import { inviteRoleLabel, roleLabel } from '@/lib/accountPermissions'

type Member = {
  id: string
  userId: string
  email: string
  role: string
}

type PendingInvite = {
  id: string
  email: string
  role: string
}

type InviteRole = 'MEMBER' | 'READ_ONLY'

export default function AccountSharing() {
  const { data: session } = useSession()
  const { showToast } = useToast()
  const [accountId, setAccountId] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [email, setEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<InviteRole>('MEMBER')
  const [loading, setLoading] = useState(false)
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null)

  const loadSettings = useCallback(async () => {
    const res = await fetch('/api/users/settings')
    if (!res.ok) return
    const data = await res.json()
    setAccountId(data.activeAccountId ?? null)
  }, [])

  const loadMembers = useCallback(async () => {
    if (!accountId) return
    const res = await fetch(`/api/accounts/${accountId}/members`)
    if (!res.ok) return
    const data = await res.json()
    setMembers(data.members ?? [])
    setPendingInvites(data.pendingInvites ?? [])
    const me = (data.members as Member[]).find(
      (m) => m.email === session?.user?.email
    )
    setRole(me?.role ?? null)
  }, [accountId, session?.user?.email])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  useEffect(() => {
    const onAccountChanged = () => {
      loadSettings()
    }
    window.addEventListener('account-changed', onAccountChanged)
    return () => window.removeEventListener('account-changed', onAccountChanged)
  }, [loadSettings])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accountId || !email.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/accounts/${accountId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role: inviteRole }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Einladung fehlgeschlagen')
      showToast(data.message, 'success')
      setEmail('')
      setInviteRole('MEMBER')
      await loadMembers()
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Einladung fehlgeschlagen',
        'error'
      )
    } finally {
      setLoading(false)
    }
  }

  const revokeInvite = async (inviteId: string) => {
    if (!accountId) return
    try {
      const res = await fetch(`/api/accounts/${accountId}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId }),
      })
      if (!res.ok) throw new Error()
      showToast('Einladung widerrufen', 'success')
      await loadMembers()
    } catch {
      showToast('Widerruf fehlgeschlagen', 'error')
    }
  }

  const removeMember = async (memberId: string) => {
    if (!accountId) return
    if (!window.confirm('Zugriff für diese Person wirklich entfernen?')) return
    try {
      const res = await fetch(`/api/accounts/${accountId}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      })
      if (!res.ok) throw new Error()
      showToast('Zugriff entfernt', 'success')
      await loadMembers()
    } catch {
      showToast('Entfernen fehlgeschlagen', 'error')
    }
  }

  const updateMemberRole = async (memberId: string, nextRole: InviteRole) => {
    if (!accountId) return
    setUpdatingMemberId(memberId)
    try {
      const res = await fetch(`/api/accounts/${accountId}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, role: nextRole }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Rolle konnte nicht geändert werden')
      showToast('Rolle aktualisiert', 'success')
      await loadMembers()
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Rolle konnte nicht geändert werden',
        'error'
      )
    } finally {
      setUpdatingMemberId(null)
    }
  }

  if (role !== 'OWNER') {
    return null
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleInvite} className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-Mail des Nutzers"
            className="flex-1 rounded-control border-border bg-surface shadow-sm focus:ring-accent sm:text-sm"
            required
            disabled={loading}
          />
          <Button type="submit" loading={loading} loadingText="Lädt…">
            Einladen
          </Button>
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-primary">Zugriff</legend>
          <label className="flex items-center gap-2 text-sm text-primary">
            <input
              type="radio"
              name="inviteRole"
              value="MEMBER"
              checked={inviteRole === 'MEMBER'}
              onChange={() => setInviteRole('MEMBER')}
              disabled={loading}
            />
            Mitglied (bearbeiten)
          </label>
          <label className="flex items-center gap-2 text-sm text-primary">
            <input
              type="radio"
              name="inviteRole"
              value="READ_ONLY"
              checked={inviteRole === 'READ_ONLY'}
              onChange={() => setInviteRole('READ_ONLY')}
              disabled={loading}
            />
            Nur Lesen
          </label>
        </fieldset>
      </form>
      <p className="text-xs text-secondary">
        Die eingeladene Person sieht die Anfrage in den Einstellungen und kann
        annehmen oder ablehnen. Noch nicht registriert? Nach der Registrierung mit
        dieser E-Mail wird die Einladung ebenfalls dort angezeigt.
      </p>

      {members.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-primary mb-2">Mitglieder</h3>
          <ul className="divide-y divide-border rounded-control border border-border">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 py-2 text-sm"
              >
                <span className="text-primary truncate">{m.email}</span>
                <span className="flex flex-wrap items-center gap-2 shrink-0">
                  <span className="text-xs text-secondary">{roleLabel(m.role)}</span>
                  {m.email !== session?.user?.email && m.role !== 'OWNER' && (
                    <>
                      <select
                        value={m.role === 'READ_ONLY' ? 'READ_ONLY' : 'MEMBER'}
                        onChange={(e) =>
                          updateMemberRole(m.id, e.target.value as InviteRole)
                        }
                        disabled={updatingMemberId === m.id}
                        className="rounded-control border-border bg-surface text-xs"
                        aria-label={`Rolle für ${m.email}`}
                      >
                        <option value="MEMBER">Mitglied</option>
                        <option value="READ_ONLY">Nur Lesen</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeMember(m.id)}
                        className="text-xs text-danger hover:underline"
                      >
                        Entfernen
                      </button>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {pendingInvites.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-primary mb-2">
            Ausstehende Einladungen
          </h3>
          <ul className="divide-y divide-border rounded-control border border-border">
            {pendingInvites.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate">
                  <span className="text-secondary">{inv.email}</span>
                  <span className="ml-2 text-xs text-secondary">
                    ({inviteRoleLabel(inv.role)})
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => revokeInvite(inv.id)}
                  className="text-xs text-danger hover:underline shrink-0 ml-2"
                >
                  Widerrufen
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
