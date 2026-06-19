'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ExclamationCircleIcon, PlusIcon } from '@heroicons/react/24/outline'
import PageContextHeader from '@/components/PageContextHeader'
import PageLoader from '@/components/PageLoader'
import { Button } from '@/components/Button'
import { useToast } from '@/hooks/useToast'
import SplitPageShell from '@/components/split/SplitPageShell'
import SplitTabBar from '@/components/split/SplitTabBar'
import SplitExpenseModal from '@/components/split/SplitExpenseModal'
import SplitExpenseList from '@/components/split/SplitExpenseList'
import SplitBalanceSummary from '@/components/split/SplitBalanceSummary'
import SplitSettlementCard from '@/components/split/SplitSettlementCard'
import SplitHistoryView from '@/components/split/SplitHistoryView'
import SplitSettingsPanel from '@/components/split/SplitSettingsPanel'
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

function SplitDetailPageContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()
  const listId = params.id as string

  const [list, setList] = useState<SplitListDetail | null>(null)
  const [expenses, setExpenses] = useState<SplitExpense[]>([])
  const [balances, setBalances] = useState<SplitBalancesResponse | null>(null)
  const [history, setHistory] = useState<SplitHistoryResponse | null>(null)
  const [tab, setTab] = useState<Tab>('expenses')
  const [expenseModalOpen, setExpenseModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<SplitExpense | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const readOnly = list?.status === 'ARCHIVED'
  const isOwner = list?.role === 'OWNER'
  const canAddExpense = !readOnly && (list?.participants.length ?? 0) > 0

  const closeExpenseModal = useCallback(() => {
    setExpenseModalOpen(false)
    setEditingExpense(null)
  }, [])

  const openNewExpenseModal = useCallback(() => {
    setEditingExpense(null)
    setExpenseModalOpen(true)
  }, [])

  const openEditExpenseModal = useCallback((expense: SplitExpense) => {
    setEditingExpense(expense)
    setExpenseModalOpen(true)
  }, [])

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

  useEffect(() => {
    if (searchParams.get('new') !== '1' || loading || !list) return

    if (readOnly) {
      showToast('Archivierte Listen können keine neuen Ausgaben erfassen', 'error')
    } else if (list.participants.length === 0) {
      showToast('Bitte zuerst einen Teilnehmer in den Einstellungen anlegen', 'error')
    } else {
      openNewExpenseModal()
    }

    router.replace(`/split/${listId}`, { scroll: false })
  }, [searchParams, loading, list, readOnly, listId, router, showToast, openNewExpenseModal])

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
      closeExpenseModal()
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
    const expense = expenses.find((item) => item.id === expenseId)
    if (!confirm(`Ausgabe „${expense?.description ?? 'Posten'}" löschen?`)) return
    setError(null)
    try {
      await deleteSplitExpense(listId, expenseId)
      showToast('Ausgabe wurde gelöscht', 'success')
      await reloadAll()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ausgabe konnte nicht gelöscht werden'
      setError(message)
      showToast(message, 'error')
    }
  }

  const handleExpenseSaved = async () => {
    const wasEdit = Boolean(editingExpense)
    closeExpenseModal()
    showToast(wasEdit ? 'Ausgabe wurde aktualisiert' : 'Ausgabe wurde hinzugefügt', 'success')
    await reloadAll()
  }

  const tabs = useMemo(
    () => [
      { id: 'expenses' as Tab, label: 'Ausgaben', badge: expenses.length },
      {
        id: 'balances' as Tab,
        label: 'Salden',
        badge: balances?.suggestions.length ?? 0,
      },
      { id: 'history' as Tab, label: 'Historie' },
      { id: 'settings' as Tab, label: 'Einstellungen' },
    ],
    [expenses.length, balances?.suggestions.length]
  )

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
            {canAddExpense && (
              <Button size="sm" className="hidden md:inline-flex" onClick={openNewExpenseModal}>
                <PlusIcon className="h-4 w-4" aria-hidden="true" />
                Ausgabe
              </Button>
            )}
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
        <SplitExpenseList
          expenses={expenses}
          participants={list.participants}
          readOnly={readOnly}
          onEdit={openEditExpenseModal}
          onDelete={handleDeleteExpense}
          onAdd={canAddExpense ? openNewExpenseModal : undefined}
        />
      )}

      {tab === 'balances' && balances && (
        <div className="space-y-6">
          <SplitBalanceSummary
            balances={balances.balances}
            totalExpenses={balances.totalExpenses}
            openSettlements={balances.suggestions.length}
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
        <SplitHistoryView
          history={history}
          participantCount={list.participants.length}
        />
      )}

      {tab === 'settings' && (
        <SplitSettingsPanel
          listId={listId}
          list={list}
          readOnly={readOnly}
          isOwner={isOwner}
          onListChange={setList}
        />
      )}

      <SplitExpenseModal
        isOpen={expenseModalOpen}
        onClose={closeExpenseModal}
        listId={listId}
        participants={list.participants}
        categories={list.categories}
        expense={editingExpense}
        onSaved={handleExpenseSaved}
      />

      {canAddExpense && (
        <Button
          type="button"
          className="md:hidden fixed bottom-5 right-4 z-30 h-14 w-14 min-w-14 rounded-full p-0 shadow-lg"
          onClick={openNewExpenseModal}
          aria-label="Neue Ausgabe"
        >
          <PlusIcon className="h-6 w-6" aria-hidden="true" />
        </Button>
      )}
    </SplitPageShell>
  )
}

export default function SplitDetailPage() {
  return (
    <Suspense fallback={<PageLoader message="Split-Liste wird geladen…" />}>
      <SplitDetailPageContent />
    </Suspense>
  )
}
