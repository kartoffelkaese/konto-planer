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
import type { SplitListSummary } from '@/types/split'

function SplitOverviewPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [lists, setLists] = useState<SplitListSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [listModalOpen, setListModalOpen] = useState(false)

  const closeListModal = useCallback(() => {
    setListModalOpen(false)
  }, [])

  const openNewListModal = useCallback(() => {
    setListModalOpen(true)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getSplitLists()
      setLists(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (searchParams.get('new') !== '1' || loading) return
    openNewListModal()
    router.replace('/split', { scroll: false })
  }, [searchParams, loading, openNewListModal, router])

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
          <Button onClick={openNewListModal}>
            <PlusIcon className="h-4 w-4" aria-hidden="true" />
            Neue Liste
          </Button>
        }
      />

      {error && (
        <div
          className="mb-4 p-4 bg-danger-subtle text-danger rounded-card border border-danger/20"
          role="alert"
        >
          {error}
        </div>
      )}

      <SplitInvitations onResponded={load} />

      {lists.length === 0 && (
        <div className="rounded-lg border border-border bg-surface overflow-hidden">
          <EmptyState
            title="Noch keine Split-Listen"
            description="Legen Sie eine Liste für Urlaub, WG oder jedes gemeinsame Event an."
            actionLabel="Erste Liste anlegen"
            onAction={openNewListModal}
          />
        </div>
      )}

      {activeLists.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-medium text-primary mb-4">Aktive Listen</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeLists.map((list) => (
              <Link
                key={list.id}
                href={`/split/${list.id}`}
                className="group rounded-card border border-border bg-surface p-5 transition-[border-color,box-shadow] duration-feedback hover:border-accent-border hover:shadow-[0_8px_24px_var(--shadow-color)]"
              >
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-control border border-accent-border bg-accent-subtle text-accent">
                    <UserGroupIcon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-primary group-hover:text-accent transition-colors">
                      {list.name}
                    </h3>
                    {list.description && (
                      <p className="mt-1 text-sm text-secondary line-clamp-2">
                        {list.description}
                      </p>
                    )}
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
                  <div>
                    <dt className="text-secondary">Teilnehmer</dt>
                    <dd className="font-medium tabular-nums text-primary">
                      {list.participantCount}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-secondary">Ausgaben</dt>
                    <dd className="font-medium tabular-nums text-expense">
                      {formatCurrency(-list.totalExpenses)}
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
          <h2 className="text-lg font-medium text-primary mb-4">Archiviert</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {archivedLists.map((list) => (
              <Link
                key={list.id}
                href={`/split/${list.id}`}
                className="rounded-card border border-border bg-surface-muted p-5 opacity-90 transition-colors hover:border-accent-border"
              >
                <h3 className="font-medium text-primary">{list.name}</h3>
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
