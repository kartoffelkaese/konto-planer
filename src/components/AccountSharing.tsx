'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useToast } from '@/hooks/useToast'
import { useApiQuery } from '@/hooks/useApiQuery'
import { useUserSettings } from '@/hooks/useUserSettings'
import PlanHint from '@/components/PlanHint'
import { PLAN_MESSAGES } from '@/lib/planMessages'
import { Button } from '@/components/Button'
import ConfirmDialog from '@/components/ConfirmDialog'
import { inviteRoleLabel, roleLabel } from '@/lib/accountPermissions'
import {
  getAccountMembers,
  inviteAccountMember,
  removeAccountMember,
  updateAccountMemberRole,
  withApiErrorFallback,
} from '@/lib/api'

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
  const { settings, accountEntitlements } = useUserSettings()
  const accountId = settings?.activeAccountId ?? null
  const [email, setEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<InviteRole>('MEMBER')
  const [loading, setLoading] = useState(false)
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null)
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null)

  // Fehler still übergehen (wie bisher): die zuletzt geladene Liste bleibt stehen
  const { data: membersData, reload: loadMembers } = useApiQuery(
    `account-members:${accountId ?? ''}`,
    () =>
      getAccountMembers<{ members?: Member[]; pendingInvites?: PendingInvite[] }>(accountId ?? ''),
    { enabled: Boolean(accountId) }
  )
  const members = membersData?.members ?? []
  const pendingInvites = membersData?.pendingInvites ?? []
  const role = members.find((m) => m.email === session?.user?.email)?.role ?? null

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accountId || !email.trim()) return
    setLoading(true)
    try {
      const data = await withApiErrorFallback(
        inviteAccountMember(accountId, email.trim(), inviteRole),
        'Einladung fehlgeschlagen'
      )
      showToast(data.message, 'success')
      setEmail('')
      setInviteRole('MEMBER')
      loadMembers()
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
      await removeAccountMember(accountId, { inviteId })
      showToast('Einladung widerrufen', 'success')
      loadMembers()
    } catch {
      showToast('Widerruf fehlgeschlagen', 'error')
    }
  }

  const removeMember = async (memberId: string) => {
    if (!accountId) return
    try {
      await removeAccountMember(accountId, { memberId })
      showToast('Zugriff entfernt', 'success')
      loadMembers()
    } catch {
      showToast('Entfernen fehlgeschlagen', 'error')
    }
  }

  const updateMemberRole = async (memberId: string, nextRole: InviteRole) => {
    if (!accountId) return
    setUpdatingMemberId(memberId)
    try {
      await withApiErrorFallback(
        updateAccountMemberRole(accountId, memberId, nextRole),
        'Rolle konnte nicht geändert werden'
      )
      showToast('Rolle aktualisiert', 'success')
      loadMembers()
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
      {accountEntitlements.shareAccounts ? (
      <form onSubmit={handleInvite} className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-Mail des Nutzers"
            className="flex-1"
            aria-label="E-Mail der einzuladenden Person"
            required
            disabled={loading}
          />
          <Button type="submit" variant="secondary" loading={loading} loadingText="Wird eingeladen…">
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
      ) : (
        <PlanHint compact title={PLAN_MESSAGES.shareAccounts} />
      )}
      <p className="text-xs text-secondary">
        Die eingeladene Person sieht die Anfrage in den Einstellungen und kann
        annehmen oder ablehnen. Noch nicht registriert? Nach der Registrierung mit
        dieser E-Mail wird die Einladung ebenfalls dort angezeigt.
      </p>

      {members.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-primary mb-2">Mitglieder</h4>
          <ul className="divide-y divide-hairline rounded-control bg-surface-muted">
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
                                                aria-label={`Rolle für ${m.email}`}
                      >
                        <option value="MEMBER">Mitglied</option>
                        <option value="READ_ONLY">Nur Lesen</option>
                      </select>
                      <Button
                        type="button"
                        variant="danger-outline"
                        size="sm"
                        onClick={() => setRemoveTarget(m)}
                      >
                        Entfernen
                      </Button>
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
          <h4 className="text-sm font-medium text-primary mb-2">
            Ausstehende Einladungen
          </h4>
          <ul className="divide-y divide-hairline rounded-control bg-surface-muted">
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
                <Button
                  type="button"
                  variant="danger-outline"
                  size="sm"
                  onClick={() => revokeInvite(inv.id)}
                  className="ml-2 shrink-0"
                >
                  Widerrufen
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ConfirmDialog
        isOpen={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
        onConfirm={async () => {
          if (!removeTarget) return
          await removeMember(removeTarget.id)
        }}
        title="Zugriff entfernen?"
        message={
          removeTarget
            ? `${removeTarget.email} verliert den Zugriff auf dieses Konto. Du kannst die Person später erneut einladen.`
            : ''
        }
        confirmText="Entfernen"
        confirmLoadingText="Wird entfernt…"
        type="danger"
      />
    </div>
  )
}
