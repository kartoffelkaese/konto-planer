'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { 
  CalendarIcon,
  ChartBarIcon,
  ArrowPathIcon,
  TagIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

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
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
            <span className="block">Willkommen bei</span>
            <span className="block text-blue-600">KontoPlaner</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Ihre persönliche Finanzverwaltung - einfach, übersichtlich und effizient.
          </p>
          <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
            <div className="rounded-md shadow">
              <a
                href="/auth/login"
                className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10"
              >
                Jetzt anmelden
              </a>
            </div>
          </div>
        </div>

        {/* Feature Section */}
        <div className="py-12 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="lg:text-center">
              <h2 className="text-base text-blue-600 font-semibold tracking-wide uppercase">Features</h2>
              <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                Alles was Sie für Ihre Finanzverwaltung brauchen
              </p>
            </div>

            <div className="mt-10">
              <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
                {/* Feature 1 */}
                <div className="relative">
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                    <ChartBarIcon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div className="ml-16">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Übersichtliches Dashboard</h3>
                    <p className="mt-2 text-base text-gray-500">
                      Behalten Sie Ihre Finanzen im Blick mit unserem intuitiven Dashboard.
                    </p>
                  </div>
                </div>

                {/* Feature 2 */}
                <div className="relative">
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                    <ArrowPathIcon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div className="ml-16">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Wiederkehrende Zahlungen</h3>
                    <p className="mt-2 text-base text-gray-500">
                      Verwalten Sie Ihre regelmäßigen Einnahmen und Ausgaben effizient.
                    </p>
                  </div>
                </div>

                {/* Feature 3 */}
                <div className="relative">
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                    <TagIcon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div className="ml-16">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Kategorisierung</h3>
                    <p className="mt-2 text-base text-gray-500">
                      Organisieren Sie Ihre Transaktionen mit benutzerdefinierten Kategorien.
                    </p>
                  </div>
                </div>

                {/* Feature 4 */}
                <div className="relative">
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                    <BuildingStorefrontIcon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div className="ml-16">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Händlerverwaltung</h3>
                    <p className="mt-2 text-base text-gray-500">
                      Erfassen Sie Ihre Händler und verknüpfen Sie sie mit Kategorien.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-blue-700">
          <div className="max-w-2xl mx-auto text-center py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              <span className="block">Bereit loszulegen?</span>
              <span className="block">Starten Sie noch heute mit KontoPlaner.</span>
            </h2>
            <p className="mt-6 text-lg leading-6 text-blue-200">
              Melden Sie sich jetzt an und übernehmen Sie die Kontrolle über Ihre Finanzen.
            </p>
            <a
              href="/auth/login"
              className="mt-8 w-full inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 sm:w-auto"
            >
              Kostenlos anmelden
            </a>
            <p className="mt-4 text-sm text-blue-200">
              Noch kein Konto?{' '}
              <a href="/auth/register" className="font-medium underline">
                Jetzt registrieren
              </a>
            </p>
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Kategorieverteilung und wiederkehrende Zahlungen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Kategorieverteilung */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Ausgaben nach Kategorien</h3>
          <div className="h-80">
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
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Wiederkehrende Zahlungen */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Wiederkehrende Zahlungen (nächste 30 Tage)</h3>
            <CalendarIcon className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {data.recurringTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                <div>
                  <p className="font-medium text-gray-900">{transaction.merchant}</p>
                  <p className="text-sm text-gray-500">{transaction.category}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{formatCurrency(transaction.amount)}</p>
                  <p className="text-sm text-gray-500">Nächste Zahlung: {formatDate(transaction.date)}</p>
                </div>
              </div>
            ))}
            {data.recurringTransactions.length === 0 && (
              <p className="text-gray-500 text-center py-4">Keine wiederkehrenden Zahlungen vorhanden</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
