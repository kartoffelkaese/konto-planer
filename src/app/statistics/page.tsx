'use client'

// Statistik: Charts ohne zusätzliche Mikrointeraktionen – stabile Darstellung hat Vorrang.

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import ChartContainer from '@/components/ChartContainer'
import PageLoader from '@/components/PageLoader'
import LoadingSpinner from '@/components/LoadingSpinner'
import PageError from '@/components/PageError'
import EmptyState from '@/components/EmptyState'
import PageContextHeader from '@/components/PageContextHeader'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { useUserSettings } from '@/hooks/useUserSettings'
import { useActiveAccountReload } from '@/hooks/useActiveAccountReload'

interface Category {
  id: string
  name: string
  color: string
}

interface Merchant {
  id: string
  name: string
}

interface StatisticsData {
  date: string
  income: number
  expenses: number
  net: number
  category: string
  color: string
}

function formatEuro(value: number) {
  return `${value.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}€`
}

function hasStatisticsData(data: StatisticsData[]) {
  return data.some((entry) => entry.income > 0 || entry.expenses > 0)
}

export default function StatisticsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const {
    accountName,
    isSimpleAccount,
    loading: settingsLoading,
  } = useUserSettings()
  const [categories, setCategories] = useState<Category[]>([])
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedMerchant, setSelectedMerchant] = useState<string>('')
  const [timeRange, setTimeRange] = useState<string>('3months')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [statisticsData, setStatisticsData] = useState<StatisticsData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [metaLoading, setMetaLoading] = useState(true)

  const timeRanges = [
    { value: '1month', label: 'Letzter Monat' },
    { value: '3months', label: 'Letzte 3 Monate' },
    { value: '6months', label: 'Letzte 6 Monate' },
    { value: '1year', label: 'Letztes Jahr' },
    { value: 'custom', label: 'Benutzerdefiniert' },
  ]

  useEffect(() => {
    if (!settingsLoading && isSimpleAccount) {
      router.replace('/')
    }
  }, [settingsLoading, isSimpleAccount, router])

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()
      const sortedCategories = data.sort((a: Category, b: Category) =>
        a.name.localeCompare(b.name, 'de')
      )
      setCategories(sortedCategories)
      if (sortedCategories.length > 0) {
        setSelectedCategory(sortedCategories[0].id)
      }
    } catch (error) {
      console.error('Fehler beim Laden der Kategorien:', error)
    }
  }, [])

  const fetchMerchants = useCallback(async () => {
    try {
      const response = await fetch('/api/merchants')
      const data = await response.json()
      const sortedMerchants = data.sort((a: Merchant, b: Merchant) =>
        a.name.localeCompare(b.name, 'de')
      )
      setMerchants(sortedMerchants)
    } catch (error) {
      console.error('Fehler beim Laden der Händler:', error)
    }
  }, [])

  const loadMeta = useCallback(async () => {
    setMetaLoading(true)
    await Promise.all([fetchCategories(), fetchMerchants()])
    setMetaLoading(false)
  }, [fetchCategories, fetchMerchants])

  const fetchStatistics = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      let url = `/api/statistics?timeRange=${timeRange}`
      if (selectedCategory) {
        url += `&category=${selectedCategory}`
      }
      if (selectedMerchant) {
        url += `&merchant=${selectedMerchant}`
      }
      if (timeRange === 'custom' && customStartDate && customEndDate) {
        url += `&startDate=${customStartDate}&endDate=${customEndDate}`
      }
      const response = await fetch(url)
      const data = await response.json()
      setStatisticsData(data)
    } catch (error) {
      console.error('Fehler beim Laden der Statistiken:', error)
      setLoadError('Statistiken konnten nicht geladen werden.')
    } finally {
      setIsLoading(false)
    }
  }, [
    timeRange,
    selectedCategory,
    selectedMerchant,
    customStartDate,
    customEndDate,
  ])

  useEffect(() => {
    if (session) {
      loadMeta()
    }
  }, [session, loadMeta])

  useActiveAccountReload(() => {
    if (session) {
      setSelectedMerchant('')
      loadMeta()
    }
  })

  useEffect(() => {
    if (metaLoading) return
    if (timeRange === 'custom' && (!customStartDate || !customEndDate)) {
      return
    }
    fetchStatistics()
  }, [
    metaLoading,
    timeRange,
    selectedCategory,
    selectedMerchant,
    customStartDate,
    customEndDate,
    fetchStatistics,
  ])

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] px-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-primary">Bitte melden Sie sich an</h1>
          <p className="mt-2 text-secondary">
            Um die Statistiken zu sehen, müssen Sie angemeldet sein.
          </p>
        </div>
      </div>
    )
  }

  if (settingsLoading || isSimpleAccount) {
    return <PageLoader message="Statistiken werden geladen…" />
  }

  if ((isLoading || metaLoading) && statisticsData.length === 0 && !loadError) {
    return <PageLoader message="Statistiken werden geladen…" />
  }

  if (loadError && statisticsData.length === 0) {
    return <PageError message={loadError} onRetry={fetchStatistics} />
  }

  const selectedCategoryName = categories.find((c) => c.id === selectedCategory)?.name
  const selectedMerchantName = merchants.find((m) => m.id === selectedMerchant)?.name
  const filterSummary =
    selectedMerchantName ?? selectedCategoryName ?? 'Keine Auswahl'
  const expenseBarColor = selectedCategory
    ? statisticsData[0]?.color ?? 'var(--color-expense)'
    : 'var(--color-expense)'
  const showChart = hasStatisticsData(statisticsData)

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageContextHeader
        title="Statistiken"
        subtitle={`${accountName} · Einnahmen und Ausgaben`}
      />

      <div className="rounded-lg border border-border bg-surface p-4 md:p-5 mb-6">
        <p className="text-sm font-medium text-primary mb-3">Filter</p>
        <div className="flex flex-col md:flex-row flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <label htmlFor="stats-category" className="sr-only">
              Kategorie
            </label>
            <select
              id="stats-category"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value)
                if (e.target.value) {
                  setSelectedMerchant('')
                }
              }}
              className="block w-full pl-3 pr-10 py-2 text-base border-border focus:outline-none focus:ring-accent focus:border-accent sm:text-sm rounded-control appearance-none bg-surface text-primary border"
            >
              <option value="">Alle Kategorien</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-primary">
              <ChevronDownIcon className="h-4 w-4" />
            </div>
          </div>

          <div className="relative flex-1 min-w-[200px]">
            <label htmlFor="stats-merchant" className="sr-only">
              Händler
            </label>
            <select
              id="stats-merchant"
              value={selectedMerchant}
              onChange={(e) => {
                setSelectedMerchant(e.target.value)
                if (e.target.value) {
                  setSelectedCategory('')
                }
              }}
              className="block w-full pl-3 pr-10 py-2 text-base border-border focus:outline-none focus:ring-accent focus:border-accent sm:text-sm rounded-control appearance-none bg-surface text-primary border"
            >
              <option value="">Alle Händler</option>
              {merchants.map((merchant) => (
                <option key={merchant.id} value={merchant.id}>
                  {merchant.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-primary">
              <ChevronDownIcon className="h-4 w-4" />
            </div>
          </div>

          <div className="relative flex-1 min-w-[200px]">
            <label htmlFor="stats-range" className="sr-only">
              Zeitraum
            </label>
            <select
              id="stats-range"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-border focus:outline-none focus:ring-accent focus:border-accent sm:text-sm rounded-control appearance-none bg-surface text-primary border"
            >
              {timeRanges.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-primary">
              <ChevronDownIcon className="h-4 w-4" />
            </div>
          </div>

          {timeRange === 'custom' && (
            <>
              <div className="relative flex-1 min-w-[160px]">
                <label htmlFor="stats-start" className="sr-only">
                  Von
                </label>
                <input
                  id="stats-start"
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="block w-full pl-3 pr-3 py-2 text-base border border-border focus:outline-none focus:ring-accent focus:border-accent sm:text-sm rounded-control bg-surface text-primary"
                />
              </div>
              <div className="relative flex-1 min-w-[160px]">
                <label htmlFor="stats-end" className="sr-only">
                  Bis
                </label>
                <input
                  id="stats-end"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="block w-full pl-3 pr-3 py-2 text-base border border-border focus:outline-none focus:ring-accent focus:border-accent sm:text-sm rounded-control bg-surface text-primary"
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="bg-surface rounded-lg border border-border p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-medium text-primary">{filterSummary}</h2>
          <p className="text-sm text-secondary">
            {timeRanges.find((r) => r.value === timeRange)?.label}
          </p>
        </div>
        <div className="w-full min-w-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-[400px]">
              <LoadingSpinner size="md" />
            </div>
          ) : !showChart ? (
            <EmptyState
              title="Keine Daten für die Auswahl"
              description="Wählen Sie eine andere Kategorie, einen anderen Händler oder einen anderen Zeitraum."
            />
          ) : (
            <ChartContainer height={400}>
              <BarChart data={statisticsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: 'var(--text-color)' }}
                  tickFormatter={(value) => {
                    const date = new Date(value + '-01')
                    return date.toLocaleDateString('de-DE', {
                      month: 'short',
                      year: '2-digit',
                    })
                  }}
                  stroke="var(--text-color)"
                />
                <YAxis
                  tickFormatter={(value) => formatEuro(Number(value))}
                  tick={{ fontSize: 12, fill: 'var(--text-color)' }}
                  stroke="var(--text-color)"
                />
                <Tooltip
                  formatter={(value, name) => [
                    formatEuro(Number(value ?? 0)),
                    name === 'income' ? 'Einnahmen' : 'Ausgaben',
                  ]}
                  labelFormatter={(label) => {
                    const date = new Date(label + '-01')
                    const monthLabel = date.toLocaleDateString('de-DE', {
                      month: 'long',
                      year: 'numeric',
                    })
                    const entry = statisticsData.find((item) => item.date === label)
                    if (!entry) return monthLabel
                    return `${monthLabel} · Saldo ${formatEuro(entry.net)}`
                  }}
                  contentStyle={{
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.5rem',
                    color: 'var(--text-color)',
                  }}
                  itemStyle={{ color: 'var(--text-color)' }}
                />
                <Legend
                  formatter={(value) =>
                    value === 'income' ? 'Einnahmen' : 'Ausgaben'
                  }
                />
                <Bar
                  dataKey="income"
                  name="income"
                  fill="var(--color-income)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="expenses"
                  name="expenses"
                  fill={expenseBarColor}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          )}
        </div>
      </div>
    </div>
  )
}
