'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { CalendarIcon } from '@heroicons/react/24/outline'
import LandingPage from '@/components/LandingPage'
import PageLoader from '@/components/PageLoader'
import PageError from '@/components/PageError'
import EmptyState from '@/components/EmptyState'
import CategoryExpenseBars from '@/components/CategoryExpenseBars'

interface DashboardData {
  monthlyIncome: number
  monthlyExpenses: number
  recurringExpenses: number
  savingsRate: number
  totalBalance: number
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
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [data, setData] = useState<DashboardData>({
    monthlyIncome: 0,
    monthlyExpenses: 0,
    recurringExpenses: 0,
    savingsRate: 0,
    totalBalance: 0,
    recurringTransactions: [],
    categoryDistribution: []
  })
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const fetchDashboardData = async () => {
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
  }

  useEffect(() => {
    if (session) {
      fetchDashboardData()
    }
  }, [session])

  if (!session) {
    return <LandingPage />
  }

  if (isLoading) {
    return <PageLoader message="Dashboard wird geladen…" />
  }

  if (loadError) {
    return (
      <PageError message={loadError} onRetry={fetchDashboardData} />
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  return (
    <div className="p-6">
      <h1 className="page-title mb-6">Dashboard</h1>

      {/* Kategorieverteilung und wiederkehrende Zahlungen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Kategorieverteilung */}
        <div className="bg-surface rounded-lg border border-border p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-primary">Ausgaben nach Kategorien</h3>
            {data.categoryPeriod && (
              <p className="mt-1 text-sm text-secondary">
                Aktueller Gehaltsmonat ({data.categoryPeriod.rangeLabel}) · nur bestätigte
                Ausgaben
              </p>
            )}
          </div>
          <div className="min-w-0">
            {data.categoryDistribution.length === 0 ? (
              <EmptyState
                title="Keine Ausgaben im aktuellen Zeitraum"
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
        </div>

        {/* Wiederkehrende Zahlungen */}
        <div className="bg-surface rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-primary">Wiederkehrende Zahlungen (nächste 30 Tage)</h3>
            <CalendarIcon className="h-5 w-5 text-secondary" />
          </div>
          <div className="space-y-4">
            {data.recurringTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between py-2 border-b border-border">
                <div>
                  <p className="font-medium text-primary">{transaction.merchant}</p>
                  <p className="text-sm text-secondary">{transaction.category}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-primary">{formatCurrency(transaction.amount)}</p>
                  <p className="text-sm text-secondary">Nächste Zahlung: {formatDate(transaction.date)}</p>
                </div>
              </div>
            ))}
            {data.recurringTransactions.length === 0 && (
              <EmptyState
                title="Keine wiederkehrenden Zahlungen"
                description="In den nächsten 30 Tagen sind keine fälligen wiederkehrenden Buchungen geplant."
                actionLabel="Wiederkehrende anlegen"
                actionHref="/recurring"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
