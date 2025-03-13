'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { 
  CalendarIcon
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Willkommen bei KontoPlaner</h1>
          <p className="text-gray-600">Bitte melden Sie sich an, um Ihr Dashboard zu sehen.</p>
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
