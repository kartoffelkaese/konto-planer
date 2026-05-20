'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { 
  CalendarIcon,
  ChartBarIcon,
  ArrowPathIcon,
  TagIcon,
  BuildingStorefrontIcon,
  BanknotesIcon,
  ShieldCheckIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'
import { PieChart, Pie, Cell, Tooltip } from 'recharts'
import ChartContainer from '@/components/ChartContainer'
import PageLoader from '@/components/PageLoader'
import PageError from '@/components/PageError'
import EmptyState from '@/components/EmptyState'

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
    const features = [
      {
        icon: ChartBarIcon,
        title: 'Übersichtliches Dashboard',
        description:
          'Behalten Sie Ihre Finanzen im Blick mit unserem intuitiven Dashboard. Visualisieren Sie Ihre Ausgaben und Einnahmen auf einen Blick.',
      },
      {
        icon: BanknotesIcon,
        title: 'Transaktionsverwaltung',
        description:
          'Erfassen Sie Einnahmen und Ausgaben, kategorisieren Sie Transaktionen und verwalten Sie wiederkehrende Zahlungen.',
      },
      {
        icon: ArrowPathIcon,
        title: 'Automatisierung',
        description:
          'Automatische Erstellung ausstehender Zahlungen und Echtzeit-Aktualisierung Ihres Kontostands.',
      },
      {
        icon: TagIcon,
        title: 'Kategorien',
        description:
          'Organisieren Sie Ihre Finanzen mit anpassbaren Kategorien und behalten Sie den Überblick über Ihre Ausgaben.',
      },
      {
        icon: BuildingStorefrontIcon,
        title: 'Händlerverwaltung',
        description:
          'Verwalten Sie Ihre Händler und profitieren Sie von automatischer Kategorisierung.',
      },
      {
        icon: ShieldCheckIcon,
        title: 'Sicherheit',
        description:
          'Sichere Authentifizierung, verschlüsselte Datenübertragung und datenschutzkonforme Implementierung.',
      },
      {
        icon: ArrowDownTrayIcon,
        title: 'Backup & Export',
        description:
          'Erstellen Sie Backups Ihrer Daten und exportieren Sie Ihre Finanzübersichten.',
      },
    ]

    return (
      <div className="min-h-screen bg-canvas">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-primary sm:text-5xl md:text-6xl">
            <span className="block">Willkommen bei</span>
            <span className="block text-accent">KontoPlaner</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-secondary sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Ihre persönliche Finanzverwaltung – einfach, übersichtlich und effizient.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/auth/login"
              className="btn-primary inline-flex items-center px-6 py-3 text-base font-medium rounded-control"
            >
              Jetzt anmelden
            </Link>
            <a
              href="/auth/register"
              className="btn-secondary inline-flex items-center px-6 py-3 text-base font-medium rounded-control"
            >
              Registrieren
            </a>
          </div>
        </div>

        <div className="py-16 sm:py-20 border-t border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-sm font-medium text-secondary uppercase tracking-wide">Features</h2>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
                Alles für Ihre Finanzverwaltung
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map(({ icon: Icon, title, description }) => (
                <div key={title} className="section-card-accent p-6">
                  <div className="w-10 h-10 rounded-lg bg-accent-subtle flex items-center justify-center text-accent mb-4">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-semibold text-primary mb-2">{title}</h3>
                  <p className="text-secondary text-sm leading-relaxed">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-accent">
          <div className="max-w-7xl mx-auto py-16 px-4 sm:py-20 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Bereit loszulegen?
            </h2>
            <p className="mt-4 text-base text-white/85 max-w-xl mx-auto">
              Melden Sie sich jetzt an und übernehmen Sie die Kontrolle über Ihre Finanzen.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <a
                href="/auth/register"
                className="inline-flex items-center px-6 py-3 border-2 border-white text-base font-medium rounded-control text-accent bg-white hover:bg-accent-subtle transition-colors duration-feedback"
              >
                Kostenlos registrieren
              </a>
              <Link
                href="/auth/login"
                className="inline-flex items-center px-6 py-3 border border-white/40 text-base font-medium rounded-control text-white hover:bg-white/10 transition-colors duration-feedback"
              >
                Anmelden
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
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
          <h3 className="text-lg font-medium text-primary mb-4">Ausgaben nach Kategorien</h3>
          <div className="min-w-0">
            {data.categoryDistribution.length === 0 ? (
              <EmptyState
                title="Keine Ausgaben im aktuellen Zeitraum"
                description="Sobald Sie Ausgaben erfassen, erscheint hier die Verteilung nach Kategorien."
                actionLabel="Transaktion erfassen"
                actionHref="/transactions?new=1"
              />
            ) : (
            <ChartContainer height={320}>
              <PieChart>
                <Pie
                  data={data.categoryDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                >
                  {data.categoryDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => formatCurrency(Number(value ?? 0))}
                  contentStyle={{ 
                    backgroundColor: 'var(--card-bg)', 
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.5rem',
                    color: 'var(--text-color)'
                  }}
                />
              </PieChart>
            </ChartContainer>
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
