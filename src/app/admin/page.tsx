'use client'

import { useEffect, useState } from 'react'
import PageContextHeader from '@/components/PageContextHeader'
import PageLoader from '@/components/PageLoader'
import PageError from '@/components/PageError'
import EmptyState from '@/components/EmptyState'
import { Button } from '@/components/Button'
import AdminPlanDialog from '@/components/admin/AdminPlanDialog'
import { useApiQuery } from '@/hooks/useApiQuery'
import { useUserSettings } from '@/hooks/useUserSettings'
import { getAdminUsers } from '@/lib/api'
import { formatDate, formatDateTime } from '@/lib/dateUtils'
import { PLAN_LABELS, type PlanSourceId } from '@/lib/plans'
import type { AdminUser } from '@/types/admin'

const SOURCE_LABELS: Record<PlanSourceId, string> = {
  LEGACY: 'Bestand',
  TRIAL: 'Testphase',
  MANUAL: 'von Hand',
  STRIPE: 'Abo',
}

/** Kurzbeschreibung, woher das Level stammt und wie lange es gilt */
function planDetail(user: AdminUser): string {
  const parts: string[] = []
  if (user.planSource) parts.push(SOURCE_LABELS[user.planSource])
  if (user.planExpiresAt) {
    const expired = user.plan === 'FULL' && user.effectivePlan === 'BASIC'
    parts.push(`${expired ? 'abgelaufen am' : 'bis'} ${formatDate(user.planExpiresAt)}`)
  }
  return parts.join(' · ')
}

export default function AdminPage() {
  const { isAdmin, settings, loading: settingsLoading } = useUserSettings()
  const allowed = isAdmin && Boolean(settings?.plansEnabled)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<AdminUser | null>(null)

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, error, loading, reload } = useApiQuery(
    `admin-users:${query}:${page}`,
    () => getAdminUsers({ q: query || undefined, page }),
    { enabled: allowed }
  )

  if (settingsLoading) {
    return <PageLoader message="Wird geladen…" />
  }

  if (!allowed) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 md:py-8">
        <div className="card">
          <EmptyState
            title="Diese Seite gibt es nicht"
            actionLabel="Zur Übersicht"
            actionHref="/"
          />
        </div>
      </div>
    )
  }

  if (loading && !data) {
    return <PageLoader message="Benutzer werden geladen…" />
  }

  if (error && !data) {
    return <PageError message="Benutzer konnten nicht geladen werden." onRetry={reload} />
  }

  const users = data?.users ?? []
  const total = data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / (data?.pageSize ?? 25)))

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 md:py-8">
      <PageContextHeader
        title="Verwaltung"
        subtitle={`${total} Benutzer · Level zuweisen, Benutzer löschen`}
      />

      <div className="card p-4 md:p-5">
        <label htmlFor="admin-user-search" className="sr-only">
          Benutzer nach E-Mail suchen
        </label>
        <input
          id="admin-user-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="E-Mail suchen…"
          className="w-full sm:max-w-sm"
        />

        {users.length === 0 ? (
          <EmptyState
            title="Keine Benutzer gefunden"
            description={query ? 'Passe die Suche an.' : undefined}
          />
        ) : (
          <ul className="mt-4 divide-y divide-hairline">
            {users.map((user) => (
              <li
                key={user.id}
                className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-primary">
                    {user.email}
                    {user.isAdmin && <span className="ml-2 text-xs text-accent">Admin</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-secondary">
                    Registriert am {formatDate(user.createdAt)}
                    {!user.emailVerified && ' · E-Mail unbestätigt'} · {user.ownedAccounts}{' '}
                    {user.ownedAccounts === 1 ? 'Konto' : 'Konten'} · {user.splitLists}{' '}
                    {user.splitLists === 1 ? 'Split-Liste' : 'Split-Listen'}
                  </p>
                  <p className="mt-0.5 text-xs text-secondary">
                    Letzte Anmeldung:{' '}
                    {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'noch nicht erfasst'}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <div className="sm:text-right">
                    <p className="text-sm font-medium text-primary">
                      {PLAN_LABELS[user.effectivePlan]}
                    </p>
                    {planDetail(user) && (
                      <p className="text-xs text-secondary">{planDetail(user)}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelected(user)}
                  >
                    Verwalten
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {pageCount > 1 && (
          <div className="mt-4 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Zurück
            </Button>
            <p className="text-xs text-secondary">
              Seite {page} von {pageCount}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => p + 1)}
            >
              Weiter
            </Button>
          </div>
        )}
      </div>

      <AdminPlanDialog
        user={selected}
        onClose={() => setSelected(null)}
        onSaved={() => {
          setSelected(null)
          reload()
        }}
      />
    </div>
  )
}
