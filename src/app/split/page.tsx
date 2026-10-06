'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { PlusIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import PageContextHeader from '@/components/PageContextHeader'
import PageLoader from '@/components/PageLoader'
import PageError from '@/components/PageError'
import EmptyState from '@/components/EmptyState'
import { Button } from '@/components/Button'
import SplitInvitations from '@/components/split/SplitInvitations'
import SplitListModal from '@/components/split/SplitListModal'
import SplitPageShell from '@/components/split/SplitPageShell'
import { formatCurrency } from '@/lib/formatters'
import { getSplitLists } from '@/lib/api'
import { useApiQuery } from '@/hooks/useApiQuery'
import type { SplitListSummary } from '@/types/split'
import { useUserSettings } from '@/hooks/useUserSettings'
import PlanHint from '@/components/PlanHint'
import { PLAN_MESSAGES } from '@/lib/planMessages'

function SplitOverviewPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [listModalOpen, setListModalOpen] = useState(false)
  // Eigene Listen gehören zum eigenen Level; eingeladen mitmachen geht immer
  const canCreateLists = useUserSettings().entitlements.splitOwnLists

  const closeListModal = useCallback(() => {
    setListModalOpen(false)
  }, [])

  const openNewListModal = useCallback(() => {
    setListModalOpen(true)
  }, [])

  const {
    data: listsData,
    error: loadError,
    loading,
    reload: load,
  } = useApiQuery('split-lists', getSplitLists)
  const lists: SplitListSummary[] = listsData ?? []
  const error = loading
    ? null
    : loadError
      ? loadError instanceof Error
        ? loadError.message
        : 'Fehler beim Laden'
      : null

  // „?new=1“ (z. B. aus der Übersicht): Dialog öffnen, sobald geladen ist, dann die URL bereinigen
  const newRequested = searchParams.get('new') === '1' && !loading
  const [prevNewRequested, setPrevNewRequested] = useState(false)
  if (newRequested !== prevNewRequested) {
    setPrevNewRequested(newRequested)
    if (newRequested && canCreateLists) setListModalOpen(true)
  }

  useEffect(() => {
    if (newRequested) router.replace('/split', { scroll: false })
  }, [newRequested, router])

  const handleListCreated = useCallback(
    async (list: SplitListSummary) => {
      closeListModal()
      router.push(`/split/${list.id}`)
    },
    [closeListModal, router]
  )

  if (loading) {
    return <PageLoader message="Split-Listen werden geladen…" />
  }

  if (error && lists.length === 0) {
    return (
      <SplitPageShell>
        <PageError message={error} onRetry={load} />
      </SplitPageShell>
    )
  }

  const activeLists = lists.filter((l) => l.status === 'ACTIVE')
  const archivedLists = lists.filter((l) => l.status === 'ARCHIVED')

  return (
    <SplitPageShell>
      <PageContextHeader
        title="Split"
        subtitle="Gemeinsame Ausgaben aufteilen und ausgleichen"
        actions={
          canCreateLists && (
            <Button onClick={openNewListModal}>
              <PlusIcon className="h-5 w-5" aria-hidden="true" />
              Neue Liste
            </Button>
          )
        }
      />

      {!canCreateLists && lists.length > 0 && (
        <PlanHint compact title={PLAN_MESSAGES.splitOwnLists} className="mb-4" />
      )}

      {error && (
        <div
          className="mb-4 p-4 bg-danger-subtle text-danger rounded-card"
          role="alert"
        >
          {error}
        </div>
      )}

      <SplitInvitations onResponded={load} />

      {lists.length === 0 && !canCreateLists && (
        <PlanHint
          title={PLAN_MESSAGES.splitOwnLists}
          description="Du kannst trotzdem mitmachen, wenn dich jemand in eine Liste einlädt."
        />
      )}

      {lists.length === 0 && canCreateLists && (
        <div className="card overflow-hidden">
          <EmptyState
            title="Noch keine Split-Listen"
            description="Lege eine Liste für Urlaub, WG oder jedes gemeinsame Event an."
            actionLabel="Erste Liste anlegen"
            onAction={openNewListModal}
          />
        </div>
      )}

      {activeLists.length > 0 && (
        <section className="mb-8">
          <h2 className="text-base font-semibold text-primary mb-3">Aktive Listen</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeLists.map((list) => (
              <Link
                key={list.id}
                href={`/split/${list.id}`}
                className="group card p-5 transition-[box-shadow,transform] duration-feedback hover:-translate-y-0.5 hover:shadow-raised"
              >
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-accent">
                    <UserGroupIcon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-primary truncate">
                      {list.name}
                    </h3>
                    {list.description && (
                      <p className="mt-1 text-sm text-secondary line-clamp-2">
                        {list.description}
                      </p>
                    )}
                  </div>
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-3 rounded-control bg-surface-muted/70 p-3">
                  <div>
                    <dt className="eyebrow">Teilnehmer</dt>
                    <dd className="amount mt-0.5 text-primary">{list.participantCount}</dd>
                  </div>
                  <div>
                    <dt className="eyebrow">Ausgaben gesamt</dt>
                    <dd className="amount mt-0.5 text-primary">
                      {formatCurrency(list.totalExpenses)}
                    </dd>
                  </div>
                </dl>
              </Link>
            ))}
          </div>
        </section>
      )}

      {archivedLists.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-primary mb-3">Archiviert</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {archivedLists.map((list) => (
              <Link
                key={list.id}
                href={`/split/${list.id}`}
                className="rounded-card bg-surface-muted p-5 transition-colors hover:bg-hairline"
              >
                <h3 className="font-semibold text-primary">{list.name}</h3>
                <p className="mt-1 text-sm text-secondary">Archiviert · nur Lesen</p>
              </Link>
            ))}
          </div>
        </section>
      )}
      <SplitListModal
        isOpen={listModalOpen}
        onClose={closeListModal}
        onSaved={handleListCreated}
      />
    </SplitPageShell>
  )
}

export default function SplitOverviewPage() {
  return (
    <Suspense fallback={<PageLoader message="Split-Listen werden geladen…" />}>
      <SplitOverviewPageContent />
    </Suspense>
  )
}
