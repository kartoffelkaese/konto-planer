'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import {
  CalendarIcon,
  PlusIcon,
  ListBulletIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'
import LandingPage from '@/components/LandingPage'
import PageLoader from '@/components/PageLoader'
import PageError from '@/components/PageError'
import EmptyState from '@/components/EmptyState'
import CategoryExpenseBars from '@/components/CategoryExpenseBars'
import KpiCard from '@/components/KpiCard'
import DashboardRecentTransactions from '@/components/DashboardRecentTransactions'
import { Button, getButtonClassName } from '@/components/Button'
import { useUserSettings } from '@/hooks/useUserSettings'
import { resolveTransactionMerchantName } from '@/lib/merchantCategories'
import { formatCurrency } from '@/lib/formatters'
import { formatDate } from '@/lib/dateUtils'
import { ACCOUNT_CHANGED_EVENT } from '@/lib/accountSwitchEvents'

interface DashboardData {
  monthlyIncome: number
  monthlyExpenses: number
  totalBalance: number
  clearedBalance?: number
  available?: number
  totalPendingExpenses?: number
  recurringTransactions: Array<{
    id: string
    amount: number
    date: string
    category: string
    merchant: string
    description: string | null
  }>
  categoryDistribution: Array<{
    name: string
    value: number
    color: string
  }>
  categoryPeriod?: {
    startDate: string
    endDate: string
    rangeLabel: string
    salaryDay: number
  }
  monthLabel?: string
  recentTransactions?: Array<{
    id: string
    merchant: string
    amount: number
    date: string
    description: string | null
  }>
}

const emptyDashboard: DashboardData = {
  monthlyIncome: 0,
  monthlyExpenses: 0,
  totalBalance: 0,
  recurringTransactions: [],
  categoryDistribution: [],
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const { isSimpleAccount, accountName, settings } = useUserSettings()
  const [data, setData] = useState<DashboardData>(emptyDashboard)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [availableExpanded, setAvailableExpanded] = useState(false)

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const response = await fetch('/api/dashboard')
      if (!response.ok) throw new Error('Fehler beim Laden der Daten')
      const dashboardData = await response.json()
      setData(dashboardData)
    } catch (error) {
      console.error('Fehler:', error)
      setLoadError('Dashboard konnte nicht geladen werden.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (session) {
      fetchDashboardData()
    }
  }, [session, isSimpleAccount, settings?.activeAccountId, fetchDashboardData])

  useEffect(() => {
    const onAccountChanged = () => {
      if (session) fetchDashboardData()
    }
    window.addEventListener(ACCOUNT_CHANGED_EVENT, onAccountChanged)
    return () => window.removeEventListener(ACCOUNT_CHANGED_EVENT, onAccountChanged)
  }, [session, fetchDashboardData])

  if (status === 'loading') {
    return <PageLoader message="Wird geladen…" />
  }

  if (!session) {
    return <LandingPage />
  }

  if (isLoading) {
    return <PageLoader message="Dashboard wird geladen…" />
  }

  if (loadError) {
    return <PageError message={loadError} onRetry={fetchDashboardData} />
  }

  const monthLabel = data.monthLabel ?? 'Aktueller Monat'
  const monthNet = data.monthlyIncome - data.monthlyExpenses
  const recentTransactions = data.recentTransactions ?? []
  const periodLabel = data.categoryPeriod?.rangeLabel

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-title">{isSimpleAccount ? accountName : 'Dashboard'}</h1>
          {isSimpleAccount ? (
            <p className="mt-1 text-sm text-secondary">
              Einfaches Konto · Übersicht nach Kalendermonat
            </p>
          ) : periodLabel ? (
            <p className="mt-1 text-sm text-secondary">
              Gehaltsmonat · {periodLabel} · nur bestätigte Buchungen
            </p>
          ) : null}
        </div>
        {!isSimpleAccount && (
          <div className="flex flex-col gap-2 shrink-0 max-md:w-full sm:flex-row sm:flex-wrap">
            <Link
              href="/transactions?new=1"
              className={getButtonClassName({
                variant: 'primary',
                size: 'sm',
                className: 'inline-flex items-center gap-1.5 max-md:min-h-11 max-md:w-full max-md:justify-center max-md:text-sm',
              })}
            >
              <PlusIcon className="h-4 w-4" aria-hidden />
              Neue Transaktion
            </Link>
            <Link
              href="/transactions"
              className={getButtonClassName({
                variant: 'secondary',
                size: 'sm',
                className: 'inline-flex items-center gap-1.5 max-md:min-h-11 max-md:w-full max-md:justify-center max-md:text-sm',
              })}
            >
              <ListBulletIcon className="h-4 w-4" aria-hidden />
              Alle Transaktionen
            </Link>
          </div>
        )}
      </div>

      {isSimpleAccount ? (
        <div className="space-y-8">
          <div className="rounded-card border border-accent bg-accent-subtle border-l-4 border-l-accent p-6">
            <p className="text-sm font-medium text-secondary">Kontostand</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-accent">
              {formatCurrency(data.totalBalance)}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <KpiCard
              label="Einnahmen"
              subtitle={monthLabel}
              amount={data.monthlyIncome}
              stripe="income"
            />
            <KpiCard
              label="Ausgaben"
              subtitle={monthLabel}
              amount={data.monthlyExpenses}
              stripe="expense"
            />
          </div>

          {(data.monthlyIncome > 0 || data.monthlyExpenses > 0) && (
            <p className="text-sm text-secondary">
              Saldo im Monat:{' '}
              <span
                className={`font-medium tabular-nums ${
                  monthNet >= 0 ? 'text-income' : 'text-expense'
                }`}
              >
                {monthNet >= 0 ? '+' : ''}
                {formatCurrency(monthNet)}
              </span>
            </p>
          )}

          <DashboardRecentTransactions transactions={recentTransactions} />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Mobile: Verfügbar im Fokus, Details aufklappbar */}
          <div className="md:hidden space-y-3">
            <button
              type="button"
              onClick={() => setAvailableExpanded(!availableExpanded)}
              className="w-full rounded-card border border-pending/40 bg-pending-bg border-l-4 border-l-pending p-4 flex items-center justify-between gap-3 text-left"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-pending">Verfügbar</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-pending">
                  {formatCurrency(data.available ?? 0)}
                </p>
                <p className="mt-1 text-xs text-secondary">
                  Kontostand {formatCurrency(data.clearedBalance ?? 0)}
                </p>
              </div>
              <ChevronDownIcon
                className={`h-5 w-5 shrink-0 text-pending transition-transform duration-expand ${
                  availableExpanded ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            </button>

            <div
              className={`grid transition-[grid-template-rows] duration-expand ease-out ${
                availableExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              }`}
            >
              <div className="overflow-hidden">
                <div
                  className={`rounded-card border border-border bg-surface p-4 space-y-3 transition-opacity duration-expand ${
                    availableExpanded ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <p className="text-sm text-secondary">Kontostand − Ausstehend = Verfügbar</p>
                  <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
                    <div className="min-w-[7.5rem] shrink-0 rounded-control border border-border bg-canvas px-3 py-2">
                      <p className="text-xs text-secondary">Kontostand</p>
                      <p className="mt-0.5 font-semibold tabular-nums text-accent">
                        {formatCurrency(data.clearedBalance ?? 0)}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center text-secondary" aria-hidden="true">−</span>
                    <div className="min-w-[7.5rem] shrink-0 rounded-control border border-border bg-canvas px-3 py-2">
                      <p className="text-xs text-secondary">Ausstehend</p>
                      <p className="mt-0.5 font-semibold tabular-nums text-expense">
                        {formatCurrency(data.totalPendingExpenses ?? 0)}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center text-secondary" aria-hidden="true">=</span>
                    <div className="min-w-[7.5rem] shrink-0 rounded-control border border-pending/40 bg-pending-bg px-3 py-2">
                      <p className="text-xs font-semibold text-pending">Verfügbar</p>
                      <p className="mt-0.5 font-semibold tabular-nums text-pending">
                        {formatCurrency(data.available ?? 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop: unveränderte Darstellung */}
          <div className="hidden md:block rounded-card border border-border bg-surface p-6 space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <p className="text-sm font-medium text-secondary">Kontostand (gebucht)</p>
              <p className="text-3xl font-semibold tabular-nums text-accent sm:text-right">
                {formatCurrency(data.clearedBalance ?? 0)}
              </p>
            </div>

            <div className="border-t border-border pt-6 space-y-4">
              <p className="text-sm text-secondary">
                Verfügbar = was nach offenen Ausgaben übrig bleibt
              </p>

              <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                <div className="flex-1 rounded-control border border-border bg-canvas px-4 py-3">
                  <p className="text-xs font-medium text-secondary">Kontostand</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-accent">
                    {formatCurrency(data.clearedBalance ?? 0)}
                  </p>
                </div>

                <p
                  className="text-center text-lg font-medium text-secondary sm:px-1"
                  aria-hidden="true"
                >
                  −
                </p>

                <div className="flex-1 rounded-control border border-border bg-canvas px-4 py-3">
                  <p className="text-xs font-medium text-secondary">Ausstehend</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-expense">
                    {formatCurrency(data.totalPendingExpenses ?? 0)}
                  </p>
                </div>

                <p
                  className="text-center text-lg font-medium text-secondary sm:px-1"
                  aria-hidden="true"
                >
                  =
                </p>

                <div className="flex-1 rounded-control border border-pending/40 bg-pending-bg border-l-4 border-l-pending px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-pending">
                    Verfügbar
                  </p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-pending">
                    {formatCurrency(data.available ?? 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <KpiCard
              label="Einnahmen"
              subtitle={periodLabel ?? monthLabel}
              amount={data.monthlyIncome}
              stripe="income"
            />
            <KpiCard
              label="Ausgaben"
              subtitle={periodLabel ?? monthLabel}
              amount={data.monthlyExpenses}
              stripe="expense"
            />
          </div>

          <DashboardRecentTransactions transactions={recentTransactions} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-surface rounded-lg border border-border p-6">
              <div className="mb-4">
                <h2 className="text-lg font-medium text-primary">
                  Ausgaben nach Kategorien
                </h2>
                {data.categoryPeriod && (
                  <p className="mt-1 text-sm text-secondary">
                    {data.categoryPeriod.rangeLabel} · nur bestätigte Ausgaben
                  </p>
                )}
              </div>
              {data.categoryDistribution.length === 0 ? (
                <EmptyState
                  title="Keine Ausgaben im Gehaltsmonat"
                  description="Sobald Sie Ausgaben erfassen, erscheint hier die Verteilung nach Kategorien."
                  actionLabel="Transaktion erfassen"
                  actionHref="/transactions?new=1"
                />
              ) : (
                <div className="rounded-control border border-border bg-canvas p-4">
                  <CategoryExpenseBars
                    categories={data.categoryDistribution}
                    formatCurrency={formatCurrency}
                  />
                </div>
              )}
            </div>

            <div className="bg-surface rounded-lg border border-border p-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-medium text-primary">
                    Wiederkehrende Zahlungen
                  </h2>
                  <p className="mt-1 text-sm text-secondary">Nächste 30 Tage</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href="/recurring"
                    className="text-sm font-medium text-accent hover:underline"
                  >
                    Alle
                  </Link>
                  <CalendarIcon className="h-5 w-5 text-secondary" aria-hidden />
                </div>
              </div>
              <div className="space-y-1">
                {data.recurringTransactions.map((transaction) => (
                  <Link
                    key={transaction.id}
                    href="/recurring"
                    className="flex items-center justify-between gap-4 py-3 border-b border-border last:border-0 rounded-control -mx-2 px-2 hover:bg-surface-muted/80 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-primary truncate">
                        {resolveTransactionMerchantName(transaction)}
                      </p>
                      <p className="text-sm text-secondary truncate">
                        {transaction.category}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-medium tabular-nums text-primary">
                        {formatCurrency(transaction.amount)}
                      </p>
                      <p className="text-sm text-secondary">
                        {formatDate(new Date(transaction.date))}
                      </p>
                    </div>
                  </Link>
                ))}
                {data.recurringTransactions.length === 0 && (
                  <EmptyState
                    title="Keine fälligen Zahlungen"
                    description="In den nächsten 30 Tagen sind keine wiederkehrenden Buchungen geplant."
                    actionLabel="Wiederkehrende anlegen"
                    actionHref="/recurring"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
