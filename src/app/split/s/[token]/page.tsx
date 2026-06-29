'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import PageContextHeader from '@/components/PageContextHeader'
import PageLoader from '@/components/PageLoader'
import { Button } from '@/components/Button'
import SplitPageShell from '@/components/split/SplitPageShell'
import SplitTabBar from '@/components/split/SplitTabBar'
import SplitExpenseList from '@/components/split/SplitExpenseList'
import SplitBalanceSummary from '@/components/split/SplitBalanceSummary'
import SplitHistoryView from '@/components/split/SplitHistoryView'
import {
  getPublicSplitBalances,
  getPublicSplitExpenses,
  getPublicSplitHistory,
  getPublicSplitList,
} from '@/lib/api'
import type {
  SplitBalancesResponse,
  SplitExpense,
  SplitHistoryResponse,
  SplitListGuestDetail,
  SplitParticipant,
} from '@/types/split'

type Tab = 'expenses' | 'balances' | 'history'

function toParticipants(list: SplitListGuestDetail): SplitParticipant[] {
  return list.participants.map((participant) => ({
    ...participant,
    userId: null,
  }))
}

export default function SplitSharePage() {
  const params = useParams()
  const token = params.token as string

  const [list, setList] = useState<SplitListGuestDetail | null>(null)
  const [expenses, setExpenses] = useState<SplitExpense[]>([])
  const [balances, setBalances] = useState<SplitBalancesResponse | null>(null)
  const [history, setHistory] = useState<SplitHistoryResponse | null>(null)
  const [tab, setTab] = useState<Tab>('expenses')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reloadAll = useCallback(async () => {
    setError(null)
    try {
      const [listData, expenseData, balanceData, historyData] = await Promise.all([
        getPublicSplitList(token),
        getPublicSplitExpenses(token),
        getPublicSplitBalances(token),
        getPublicSplitHistory(token),
      ])
      setList(listData)
      setExpenses(expenseData)
      setBalances(balanceData)
      setHistory(historyData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden')
      setList(null)
    }
  }, [token])

  useEffect(() => {
    setLoading(true)
    reloadAll().finally(() => setLoading(false))
  }, [reloadAll])

  const tabs = useMemo(
    () => [
      { id: 'expenses' as Tab, label: 'Ausgaben', badge: expenses.length },
      {
        id: 'balances' as Tab,
        label: 'Salden',
        badge: balances?.suggestions.length ?? 0,
      },
      { id: 'history' as Tab, label: 'Historie' },
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
          <p className="text-sm text-danger">
            {error ?? 'Diese geteilte Liste ist nicht verfügbar oder der Link ist ungültig.'}
          </p>
          <Link href="/auth/register">
            <Button variant="secondary" size="sm">
              Konto erstellen
            </Button>
          </Link>
        </div>
      </SplitPageShell>
    )
  }

  const participants = toParticipants(list)

  return (
    <SplitPageShell>
      <PageContextHeader
        title={list.name}
        subtitle={
          list.status === 'ARCHIVED'
            ? 'Archiviert · nur Ansicht'
            : list.description ?? `${list.participantCount} Teilnehmer`
        }
      />

      <div className="mb-4 rounded-lg border border-accent-border bg-accent-subtle p-4 text-sm text-primary">
        <p>
          Nur Ansicht — Sie können diese Liste ansehen, aber keine Ausgaben erfassen oder
          bearbeiten.
        </p>
        <p className="mt-2 text-secondary">
          Mit Konto anmelden, um Ausgaben einzutragen. Beitritt zur Liste erfolgt weiterhin per
          Einladung des Erstellers.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/auth/register">
            <Button size="sm">Konto erstellen</Button>
          </Link>
          <Link href="/auth/login">
            <Button variant="secondary" size="sm">
              Anmelden
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-danger/20 bg-danger-subtle p-4 text-sm text-danger">
          {error}
        </div>
      )}

      <SplitTabBar tabs={tabs} activeTab={tab} onChange={setTab} ariaLabel="Geteilte Split-Liste" />

      {tab === 'expenses' && (
        <SplitExpenseList
          expenses={expenses}
          participants={participants}
          readOnly
        />
      )}

      {tab === 'balances' && balances && (
        <SplitBalanceSummary
          balances={balances.balances}
          totalExpenses={balances.totalExpenses}
          openSettlements={balances.suggestions.length}
        />
      )}

      {tab === 'history' && history && (
        <SplitHistoryView
          history={history}
          participantCount={list.participantCount}
        />
      )}
    </SplitPageShell>
  )
}
