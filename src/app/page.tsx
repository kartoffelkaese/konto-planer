'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import {
  ArrowRightIcon,
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
import { getButtonClassName } from '@/components/Button'
import { useUserSettings } from '@/hooks/useUserSettings'
import { resolveTransactionMerchantName } from '@/lib/merchantCategories'
import { formatCurrency } from '@/lib/formatters'
import { formatDate } from '@/lib/dateUtils'
import { ACCOUNT_CHANGED_EVENT } from '@/lib/accountSwitchEvents'
import { getDashboard } from '@/lib/api'

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
      const dashboardData = await getDashboard<DashboardData>()
      setData(dashboardData)
    } catch (error) {
      console.error('Fehler:', error)
      setLoadError('Übersicht konnte nicht geladen werden.')
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
    return <PageLoader message="Übersicht wird geladen…" />
  }

  if (loadError) {
    return <PageError message={loadError} onRetry={fetchDashboardData} />
  }

  const monthLabel = data.monthLabel ?? 'Aktueller Monat'
  const monthNet = data.monthlyIncome - data.monthlyExpenses
  const recentTransactions = data.recentTransactions ?? []
  const periodLabel = data.categoryPeriod?.rangeLabel

  const clearedBalance = data.clearedBalance ?? 0
  const pendingExpenses = data.totalPendingExpenses ?? 0
  const available = data.available ?? 0
  const availableShare =
    clearedBalance > 0 ? Math.min(Math.max(available / clearedBalance, 0), 1) : 0

  return (
    <div className="px-4 py-6 sm:px-6 md:py-8 max-w-6xl mx-auto">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">{isSimpleAccount ? accountName : 'Übersicht'}</h1>
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
          <div className="flex gap-2 shrink-0">
            <Link
              href="/transactions?new=1"
              className={getButtonClassName({
                variant: 'primary',
                className: 'max-sm:flex-1 whitespace-nowrap',
              })}
            >
              <PlusIcon className="h-5 w-5" aria-hidden />
              Neue Transaktion
            </Link>
            <Link
              href="/transactions"
              className={getButtonClassName({
                variant: 'secondary',
                className: 'max-sm:hidden whitespace-nowrap',
              })}
            >
              <ListBulletIcon className="h-5 w-5" aria-hidden />
              Alle Buchungen
            </Link>
          </div>
        )}
      </div>

      {isSimpleAccount ? (
        <div className="space-y-4 md:space-y-6">
          <section className="hero-card p-6 md:p-8">
            <p className="eyebrow">Kontostand</p>
            <p
              className={`amount-hero mt-2 ${
                data.totalBalance < 0 ? 'text-expense' : 'text-primary'
              }`}
            >
              {formatCurrency(data.totalBalance)}
            </p>
            {(data.monthlyIncome > 0 || data.monthlyExpenses > 0) && (
              <p className="mt-4 chip">
                Saldo {monthLabel}
                <span
                  className={`amount ${monthNet >= 0 ? 'text-income' : 'text-expense'}`}
                >
                  {monthNet > 0 ? '+' : ''}
                  {formatCurrency(monthNet)}
                </span>
              </p>
            )}
          </section>

          <div className="grid grid-cols-2 gap-3 md:gap-4">
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

          <DashboardRecentTransactions transactions={recentTransactions} />
        </div>
      ) : (
        <div className="space-y-4 md:space-y-6">
          <section className="hero-card p-6 md:p-8" aria-labelledby="available-label">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p id="available-label" className="eyebrow">
                  Verfügbar
                </p>
                <p
                  className={`amount-hero mt-2 ${
                    available < 0 ? 'text-expense' : 'text-primary'
                  }`}
                >
                  {formatCurrency(available)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAvailableExpanded(!availableExpanded)}
                aria-expanded={availableExpanded}
                aria-controls="available-details"
                className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-pill bg-surface-muted/80 px-3 text-sm font-medium text-secondary hover:text-primary"
              >
                <span className="max-sm:sr-only">So berechnet</span>
                <ChevronDownIcon
                  className={`h-4 w-4 transition-transform duration-expand ${
                    availableExpanded ? 'rotate-180' : ''
                  }`}
                  aria-hidden="true"
                />
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="chip">
                Kontostand
                <span className="amount text-primary">{formatCurrency(clearedBalance)}</span>
              </span>
              <span className="chip">
                Ausstehend
                <span className="amount text-expense">
                  {formatCurrency(-pendingExpenses)}
                </span>
              </span>
            </div>

            <div className="mt-6">
              <div
                className="h-2 overflow-hidden rounded-full bg-surface-muted"
                role="progressbar"
                aria-label="Anteil verfügbar am Kontostand"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(availableShare * 100)}
              >
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-500"
                  style={{ width: `${availableShare * 100}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-secondary">
                {Math.round(availableShare * 100)} % des Kontostands frei verfügbar
              </p>
            </div>

            <div
              id="available-details"
              className={`grid transition-[grid-template-rows] duration-expand ease-out ${
                availableExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              }`}
            >
              <div className="overflow-hidden" inert={!availableExpanded}>
                <div className="mt-5 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 rounded-control bg-surface-muted/70 p-3 text-center sm:p-4">
                  <div>
                    <p className="eyebrow">Kontostand</p>
                    <p className="amount mt-0.5 text-sm sm:text-base">
                      {formatCurrency(clearedBalance)}
                    </p>
                  </div>
                  <span className="text-secondary" aria-hidden="true">−</span>
                  <div>
                    <p className="eyebrow">Ausstehend</p>
                    <p className="amount mt-0.5 text-sm text-expense sm:text-base">
                      {formatCurrency(pendingExpenses)}
                    </p>
                  </div>
                  <span className="text-secondary" aria-hidden="true">=</span>
                  <div>
                    <p className="eyebrow">Verfügbar</p>
                    <p className="amount mt-0.5 text-sm text-accent sm:text-base">
                      {formatCurrency(available)}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-secondary">
                  Verfügbar ist, was nach offenen Ausgaben vom gebuchten Kontostand übrig bleibt.
                </p>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
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
            <div className="col-span-2 md:col-span-1">
              <KpiCard
                label="Netto"
                subtitle={periodLabel ?? monthLabel}
                amount={monthNet}
                stripe={monthNet >= 0 ? 'income' : 'expense'}
                signed
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
            <DashboardRecentTransactions transactions={recentTransactions} />

            <section className="card p-5 md:p-6">
              <div className="flex items-center justify-between gap-4 mb-3">
                <div>
                  <h2 className="text-base font-semibold text-primary">
                    Wiederkehrend
                  </h2>
                  <p className="text-sm text-secondary">Nächste 30 Tage</p>
                </div>
                <Link
                  href="/recurring"
                  className="inline-flex min-h-11 items-center gap-1 rounded-pill px-3 -mr-3 text-sm font-medium text-accent hover:bg-accent-subtle"
                >
                  Alle
                  <ArrowRightIcon className="h-4 w-4" aria-hidden />
                </Link>
              </div>
              {data.recurringTransactions.length === 0 ? (
                <EmptyState
                  title="Keine fälligen Zahlungen"
                  description="In den nächsten 30 Tagen sind keine wiederkehrenden Buchungen geplant."
                  actionLabel="Wiederkehrende anlegen"
                  actionHref="/recurring"
                />
              ) : (
                <ul className="-mx-2">
                  {data.recurringTransactions.map((transaction) => {
                    const name = resolveTransactionMerchantName(transaction)
                    return (
                      <li key={transaction.id}>
                        <Link
                          href="/recurring"
                          className="flex items-center gap-3 rounded-control px-2 py-2.5 transition-colors hover:bg-surface-muted"
                        >
                          <span
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-accent"
                            aria-hidden="true"
                          >
                            <CalendarIcon className="h-5 w-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-primary truncate">{name}</p>
                            <p className="text-sm text-secondary truncate">
                              {formatDate(new Date(transaction.date))} · {transaction.category}
                            </p>
                          </div>
                          {/* API liefert Beträge ohne Vorzeichen (Math.abs) */}
                          <p className="amount shrink-0 text-primary">
                            {formatCurrency(transaction.amount)}
                          </p>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </div>

          <section className="card p-5 md:p-6">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-primary">
                Ausgaben nach Kategorien
              </h2>
              {data.categoryPeriod && (
                <p className="text-sm text-secondary">
                  {data.categoryPeriod.rangeLabel} · nur bestätigte Ausgaben
                </p>
              )}
            </div>
            {data.categoryDistribution.length === 0 ? (
              <EmptyState
                title="Keine Ausgaben im Gehaltsmonat"
                description="Sobald du Ausgaben erfasst, erscheint hier die Verteilung nach Kategorien."
                actionLabel="Transaktion erfassen"
                actionHref="/transactions?new=1"
              />
            ) : (
              <CategoryExpenseBars
                categories={data.categoryDistribution}
                formatCurrency={formatCurrency}
              />
            )}
          </section>
        </div>
      )}
    </div>
  )
}
