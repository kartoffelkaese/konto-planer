'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ExclamationCircleIcon, PlusIcon } from '@heroicons/react/24/outline'
import PageContextHeader from '@/components/PageContextHeader'
import PageLoader from '@/components/PageLoader'
import { Button } from '@/components/Button'
import { useToast } from '@/hooks/useToast'
import SplitPageShell from '@/components/split/SplitPageShell'
import SplitTabBar from '@/components/split/SplitTabBar'
import SplitExpenseForm from '@/components/split/SplitExpenseForm'
import SplitExpenseList from '@/components/split/SplitExpenseList'
import SplitBalanceSummary from '@/components/split/SplitBalanceSummary'
import SplitSettlementCard from '@/components/split/SplitSettlementCard'
import SplitHistoryView from '@/components/split/SplitHistoryView'
import SplitParticipantList from '@/components/split/SplitParticipantList'
import SplitCategoryManager from '@/components/split/SplitCategoryManager'
import {
  deleteSplitExpense,
  deleteSplitList,
  getSplitBalances,
  getSplitExpenses,
  getSplitHistory,
  getSplitList,
  updateSplitList,
} from '@/lib/api'
import type {
  SplitBalancesResponse,
  SplitExpense,
  SplitHistoryResponse,
  SplitListDetail,
} from '@/types/split'

type Tab = 'expenses' | 'balances' | 'history' | 'settings'

function formatSplitListDeleteError(message: string, listName?: string): string {
  if (message.includes('HTTP 500') || message.includes('nicht gelöscht')) {
    const label = listName ? `„${listName}"` : 'Die Split-Liste'
    return `${label} konnte gerade nicht gelöscht werden. Bitte versuchen Sie es in ein paar Sekunden erneut.`
  }
  if (message.includes('Nur der Ersteller')) {
    return 'Nur der Ersteller der Liste darf sie löschen.'
  }
  return message
}

export default function SplitDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { showToast } = useToast()
  const listId = params.id as string

  const [list, setList] = useState<SplitListDetail | null>(null)
  const [expenses, setExpenses] = useState<SplitExpense[]>([])
  const [balances, setBalances] = useState<SplitBalancesResponse | null>(null)
  const [history, setHistory] = useState<SplitHistoryResponse | null>(null)
  const [tab, setTab] = useState<Tab>('expenses')
  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<SplitExpense | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const readOnly = list?.status === 'ARCHIVED'
  const isOwner = list?.role === 'OWNER'

  const loadList = useCallback(async () => {
    const data = await getSplitList(listId)
    setList(data)
    return data
  }, [listId])

  const loadExpenses = useCallback(async () => {
    const data = await getSplitExpenses(listId)
    setExpenses(data)
  }, [listId])

  const loadBalances = useCallback(async () => {
    const data = await getSplitBalances(listId)
    setBalances(data)
  }, [listId])

  const loadHistory = useCallback(async () => {
    const data = await getSplitHistory(listId)
    setHistory(data)
  }, [listId])

  const reloadAll = useCallback(async () => {
    setError(null)
    try {
      await Promise.all([loadList(), loadExpenses(), loadBalances(), loadHistory()])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden')
    }
  }, [loadList, loadExpenses, loadBalances, loadHistory])

  useEffect(() => {
    setLoading(true)
    reloadAll().finally(() => setLoading(false))
  }, [reloadAll])

  const handleArchive = async () => {
    if (!list) return
    if (
      !confirm(
        `Split-Liste „${list.name}" archivieren? Es können dann keine neuen Ausgaben mehr erfasst werden.`
      )
    ) {
      return
    }
    setError(null)
    try {
      const updated = await updateSplitList(listId, { status: 'ARCHIVED' })
      setList(updated)
      setShowForm(false)
      showToast(`„${list.name}" wurde archiviert`, 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fehler beim Archivieren'
      setError(message)
      showToast(message, 'error')
    }
  }

  const handleUnarchive = async () => {
    if (!list) return
    if (
      !confirm(
        `Split-Liste „${list.name}" wieder aktivieren? Ausgaben und Einstellungen können dann wieder bearbeitet werden.`
      )
    ) {
      return
    }
    setError(null)
    try {
      const updated = await updateSplitList(listId, { status: 'ACTIVE' })
      setList(updated)
      showToast(`„${list.name}" ist wieder aktiv`, 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fehler beim Reaktivieren'
      setError(message)
      showToast(message, 'error')
    }
  }

  const handleDelete = async () => {
    if (!list) return
    if (
      !confirm(
        `Split-Liste „${list.name}" endgültig löschen? Alle Ausgaben, Salden und Teilnehmer werden unwiderruflich entfernt.`
      )
    ) {
      return
    }
    setError(null)
    try {
      await deleteSplitList(listId)
      showToast(`„${list.name}" wurde gelöscht`, 'success')
      router.push('/split')
    } catch (err) {
      const raw =
        err instanceof Error ? err.message : 'Die Split-Liste konnte nicht gelöscht werden'
      const friendly = formatSplitListDeleteError(raw, list.name)
      setError(friendly)
      showToast(friendly, 'error')
    }
  }

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Ausgabe löschen?')) return
    try {
      await deleteSplitExpense(listId, expenseId)
      await reloadAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler')
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'expenses', label: 'Ausgaben' },
    { id: 'balances', label: 'Salden' },
    { id: 'history', label: 'Historie' },
    { id: 'settings', label: 'Einstellungen' },
  ]

  if (loading && !list) {
    return <PageLoader message="Split-Liste wird geladen…" />
  }

  if (!list) {
    return (
      <SplitPageShell>
        <div className="py-12 text-center space-y-4">
          <p className="text-sm text-danger">{error ?? 'Liste nicht gefunden'}</p>
          <Link href="/split">
            <Button variant="secondary" size="sm">
              Zurück zur Übersicht
            </Button>
          </Link>
        </div>
      </SplitPageShell>
    )
  }

  return (
    <SplitPageShell>
      <PageContextHeader
        title={list.name}
        subtitle={
          list.status === 'ARCHIVED'
            ? 'Archiviert · nur Lesen'
            : list.description ?? `${list.participantCount} Teilnehmer`
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/split">
              <Button variant="secondary" size="sm">
                Zurück
              </Button>
            </Link>
            {isOwner && !readOnly && (
              <Button variant="secondary" size="sm" onClick={handleArchive}>
                Archivieren
              </Button>
            )}
            {isOwner && readOnly && (
              <Button variant="secondary" size="sm" onClick={handleUnarchive}>
                Reaktivieren
              </Button>
            )}
            {isOwner && (
              <Button variant="danger-outline" size="sm" onClick={handleDelete}>
                Löschen
              </Button>
            )}
          </div>
        }
      />

      {readOnly && (
        <div className="mb-4 rounded-lg border border-accent-border bg-accent-subtle p-4 text-sm text-primary">
          Diese Liste ist archiviert. Ausgaben und Einstellungen können nicht mehr geändert werden.
          {isOwner && (
            <span>
              {' '}
              Als Ersteller können Sie sie jederzeit über „Reaktivieren“ wieder bearbeitbar machen.
            </span>
          )}
        </div>
      )}

      {error && (
        <div
          className="mb-4 flex items-start gap-3 rounded-card border border-danger/20 bg-danger-subtle p-4 text-sm text-danger"
          role="alert"
        >
          <ExclamationCircleIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}

      <SplitTabBar tabs={tabs} activeTab={tab} onChange={setTab} ariaLabel="Split-Listenbereiche" />

      {tab === 'expenses' && (
        <div className="space-y-6">
          {!readOnly && !showForm && !editingExpense && (
            <Button onClick={() => setShowForm(true)}>
              <PlusIcon className="h-4 w-4" aria-hidden="true" />
              Ausgabe hinzufügen
            </Button>
          )}

          {!readOnly && (showForm || editingExpense) && list.participants.length > 0 && (
            <SplitExpenseForm
              listId={listId}
              participants={list.participants}
              categories={list.categories}
              expense={editingExpense}
              onSaved={async () => {
                setShowForm(false)
                setEditingExpense(null)
                await reloadAll()
              }}
              onCancel={() => {
                setShowForm(false)
                setEditingExpense(null)
              }}
            />
          )}

          <SplitExpenseList
            expenses={expenses}
            participants={list.participants}
            readOnly={readOnly}
            onEdit={(expense) => {
              setEditingExpense(expense)
              setShowForm(false)
            }}
            onDelete={handleDeleteExpense}
            onAdd={() => setShowForm(true)}
          />
        </div>
      )}

      {tab === 'balances' && balances && (
        <div className="space-y-6">
          <SplitBalanceSummary
            balances={balances.balances}
            totalExpenses={balances.totalExpenses}
          />
          <SplitSettlementCard
            listId={listId}
            suggestions={balances.suggestions}
            onSettled={reloadAll}
            readOnly={readOnly}
          />
        </div>
      )}

      {tab === 'history' && history && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <SplitHistoryView history={history} />
        </div>
      )}

      {tab === 'settings' && (
        <div className="space-y-6 max-w-2xl">
          <SplitParticipantList
            listId={listId}
            participants={list.participants}
            onChange={(participants) => setList({ ...list, participants })}
            readOnly={readOnly}
            canManage={isOwner && !readOnly}
          />
          <SplitCategoryManager
            listId={listId}
            categories={list.categories}
            onChange={(categories) => setList({ ...list, categories })}
            readOnly={readOnly}
          />
        </div>
      )}
    </SplitPageShell>
  )
}
