'use client'

import { useState, useEffect } from 'react'
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
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, XAxis, YAxis, Bar } from 'recharts'

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

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch('/api/dashboard')
        if (!response.ok) throw new Error('Fehler beim Laden der Daten')
        const dashboardData = await response.json()
        console.log('Dashboard-Daten:', dashboardData)
        console.log('Kategorieverteilung:', dashboardData.categoryDistribution)
        setData(dashboardData)
      } catch (error) {
        console.error('Fehler:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (session) {
      fetchDashboardData()
    }
  }, [session])

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {/* Hero Section mit Animation */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-100/20 to-indigo-100/20 dark:from-blue-900/20 dark:to-indigo-900/20 transform -skew-y-6 origin-top-right"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center relative z-20">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white sm:text-5xl md:text-6xl">
            <span className="block">Willkommen bei</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">KontoPlaner</span>
          </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-600 dark:text-gray-300 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Ihre persönliche Finanzverwaltung - einfach, übersichtlich und effizient.
          </p>
            <div className="mt-8 flex justify-center gap-4">
              <a
                href="/api/auth/signin"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 dark:from-blue-500 dark:to-indigo-500 dark:hover:from-blue-600 dark:hover:to-indigo-600 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Jetzt anmelden
              </a>
              <a
                href="/auth/register"
                className="inline-flex items-center px-6 py-3 border-2 border-blue-600 dark:border-blue-400 text-base font-medium rounded-lg text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Registrieren
              </a>
            </div>
          </div>
        </div>

        {/* Feature Section mit modernem Grid-Layout */}
        <div className="py-20 bg-white dark:bg-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-base text-blue-600 dark:text-blue-400 font-semibold tracking-wide uppercase">Features</h2>
              <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                Alles was Sie für Ihre Finanzverwaltung brauchen
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Dashboard Feature */}
              <div className="group relative bg-white dark:bg-gray-700 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 dark:border-gray-600">
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <ChartBarIcon className="h-6 w-6" aria-hidden="true" />
                  </div>
                <div className="mt-8">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Übersichtliches Dashboard</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Behalten Sie Ihre Finanzen im Blick mit unserem intuitiven Dashboard. Visualisieren Sie Ihre Ausgaben und Einnahmen auf einen Blick.
                    </p>
                  </div>
                </div>

              {/* Transaktionsverwaltung */}
              <div className="group relative bg-white dark:bg-gray-700 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 dark:border-gray-600">
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <BanknotesIcon className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="mt-8">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Transaktionsverwaltung</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Erfassen Sie Einnahmen und Ausgaben, kategorisieren Sie Transaktionen und verwalten Sie wiederkehrende Zahlungen.
                  </p>
                </div>
              </div>

              {/* Automatisierung */}
              <div className="group relative bg-white dark:bg-gray-700 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 dark:border-gray-600">
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <ArrowPathIcon className="h-6 w-6" aria-hidden="true" />
                  </div>
                <div className="mt-8">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Automatisierung</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Automatische Erstellung ausstehender Zahlungen und Echtzeit-Aktualisierung Ihres Kontostands.
                    </p>
                  </div>
                </div>

              {/* Händlerverwaltung */}
              <div className="group relative bg-white dark:bg-gray-700 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 dark:border-gray-600">
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <BuildingStorefrontIcon className="h-6 w-6" aria-hidden="true" />
                  </div>
                <div className="mt-8">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Händlerverwaltung</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Verwalten Sie Ihre Händler und profitieren Sie von automatischer Kategorisierung.
                    </p>
                  </div>
                </div>

              {/* Sicherheit */}
              <div className="group relative bg-white dark:bg-gray-700 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 dark:border-gray-600">
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <ShieldCheckIcon className="h-6 w-6" aria-hidden="true" />
                  </div>
                <div className="mt-8">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Sicherheit</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Sichere Authentifizierung, verschlüsselte Datenübertragung und datenschutzkonforme Implementierung.
                    </p>
                  </div>
              </div>

              {/* Backup */}
              <div className="group relative bg-white dark:bg-gray-700 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 dark:border-gray-600">
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <ArrowDownTrayIcon className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="mt-8">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Backup & Export</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Erstellen Sie Backups Ihrer Daten und exportieren Sie Ihre Finanzübersichten.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section mit modernem Design */}
        <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:60px_60px]"></div>
          <div className="relative max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8">
            <div className="text-center">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              <span className="block">Bereit loszulegen?</span>
              <span className="block">Starten Sie noch heute mit KontoPlaner.</span>
            </h2>
              <p className="mt-6 text-lg leading-6 text-blue-100">
              Melden Sie sich jetzt an und übernehmen Sie die Kontrolle über Ihre Finanzen.
            </p>
              <div className="mt-10 flex justify-center gap-4">
            <a
                  href="/auth/register"
                  className="inline-flex items-center px-6 py-3 border-2 border-white text-base font-medium rounded-lg text-white hover:bg-white hover:text-blue-600 dark:hover:text-blue-700 transition-all duration-200"
            >
                  Kostenlos registrieren
            </a>
                <a
                  href="/api/auth/signin"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-blue-600 dark:text-blue-700 bg-white hover:bg-blue-50 dark:hover:bg-gray-100 transition-all duration-200"
                >
                  Anmelden
              </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
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
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Dashboard</h1>

      {/* Kategorieverteilung und wiederkehrende Zahlungen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Kategorieverteilung */}
        <div className="bg-white dark:bg-dark-light rounded-lg shadow-md dark:shadow-dark p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Ausgaben nach Kategorien</h3>
          <div className="h-80">
            {data.categoryDistribution.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500 dark:text-gray-400">Keine Ausgaben im aktuellen Zeitraum</p>
              </div>
            ) : (
            <ResponsiveContainer width="100%" height="100%">
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
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ 
                    backgroundColor: 'var(--card-bg)', 
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.5rem',
                    color: 'var(--text-color)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Wiederkehrende Zahlungen */}
        <div className="bg-white dark:bg-dark-light rounded-lg shadow-md dark:shadow-dark p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Wiederkehrende Zahlungen (nächste 30 Tage)</h3>
            <CalendarIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          <div className="space-y-4">
            {data.recurringTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-dark-lighter">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{transaction.merchant}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{transaction.category}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(transaction.amount)}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Nächste Zahlung: {formatDate(transaction.date)}</p>
                </div>
              </div>
            ))}
            {data.recurringTransactions.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">Keine wiederkehrenden Zahlungen vorhanden</p>
            )}
          </div>
        </div>
      </div>

      {/* Grafik */}
      <div className="bg-white dark:bg-dark-light rounded-lg shadow dark:shadow-dark p-4 md:p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Ausgaben pro Kategorie</h3>
        <div className="h-[300px] md:h-[400px] -mx-4 md:mx-0">
          {data.categoryDistribution.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 dark:text-gray-400">Keine Ausgaben im aktuellen Zeitraum</p>
            </div>
          ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.categoryDistribution}>
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={60}
                interval={0}
                tick={{ fontSize: 12, fill: 'var(--text-color)' }}
              />
              <YAxis 
                tickFormatter={(value) => `${value}€`}
                tick={{ fontSize: 12, fill: 'var(--text-color)' }}
              />
              <Tooltip 
                formatter={(value: number) => [`${value.toFixed(2)}€`, 'Ausgaben']}
                labelFormatter={(label) => `Kategorie: ${label}`}
                contentStyle={{ 
                  backgroundColor: 'var(--card-bg)', 
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.5rem',
                  color: 'var(--text-color)'
                }}
              />
              <Bar dataKey="value" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
