'use client'

// Statistik: Charts ohne zusätzliche Mikrointeraktionen – stabile Darstellung hat Vorrang.

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import ChartContainer from '@/components/ChartContainer'
import PageLoader from '@/components/PageLoader'
import LoadingSpinner from '@/components/LoadingSpinner'
import PageError from '@/components/PageError'
import EmptyState from '@/components/EmptyState'
import PageContextHeader from '@/components/PageContextHeader'
import SegmentedControl from '@/components/SegmentedControl'
import KpiCard from '@/components/KpiCard'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { useUserSettings } from '@/hooks/useUserSettings'
import { useActiveAccountReload } from '@/hooks/useActiveAccountReload'
import { useApiQuery } from '@/hooks/useApiQuery'
import { getCategories, getMerchants, getStatistics } from '@/lib/api'

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
  })} €`
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

  // Kategorien und Händler für die Filter. Jede Liste wird einzeln übernommen – schlägt eine
  // fehl, bleibt die andere nutzbar (wie bisher).
  const { loading: metaQueryLoading, reload: loadMeta } = useApiQuery(
    `statistics-meta:${session?.user?.id ?? ''}`,
    () =>
      Promise.all([
        getCategories<Category>().catch((error: unknown) => {
          console.error('Fehler beim Laden der Kategorien:', error)
          return null
        }),
        getMerchants().catch((error: unknown) => {
          console.error('Fehler beim Laden der Händler:', error)
          return null
        }),
      ]),
    {
      enabled: Boolean(session),
      onSuccess: ([categoryData, merchantData]) => {
        if (categoryData) {
          const sortedCategories = [...categoryData].sort((a, b) =>
            a.name.localeCompare(b.name, 'de')
          )
          setCategories(sortedCategories)
          if (sortedCategories.length > 0) {
            setSelectedCategory(sortedCategories[0].id)
          }
        }
        if (merchantData) {
          setMerchants([...merchantData].sort((a, b) => a.name.localeCompare(b.name, 'de')))
        }
      },
    }
  )
  const metaLoading = !session || metaQueryLoading

  useActiveAccountReload(() => {
    if (session) {
      setSelectedMerchant('')
      loadMeta()
    }
  })

  // Statistiken laden, sobald die Filter bereit sind; ein unvollständiger eigener Zeitraum lädt nicht
  const customRangeIncomplete = timeRange === 'custom' && (!customStartDate || !customEndDate)
  const {
    data: statisticsResult,
    error: statisticsError,
    loading: isLoading,
    reload: fetchStatistics,
  } = useApiQuery(
    `statistics:${timeRange}:${selectedCategory}:${selectedMerchant}:${customStartDate}:${customEndDate}`,
    () => {
      const isCustomRange = timeRange === 'custom' && customStartDate && customEndDate
      return getStatistics<StatisticsData[]>({
        timeRange,
        category: selectedCategory || undefined,
        merchant: selectedMerchant || undefined,
        startDate: isCustomRange ? customStartDate : undefined,
        endDate: isCustomRange ? customEndDate : undefined,
      })
    },
    {
      enabled: !metaLoading && !customRangeIncomplete,
      onError: (error) => console.error('Fehler beim Laden der Statistiken:', error),
    }
  )
  const statisticsData = useMemo(() => statisticsResult ?? [], [statisticsResult])
  const loadError =
    !isLoading && statisticsError ? 'Statistiken konnten nicht geladen werden.' : null

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] px-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-primary">Bitte melde dich an</h1>
          <p className="mt-2 text-secondary">
            Um die Statistiken zu sehen, musst du angemeldet sein.
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
    selectedMerchantName ?? selectedCategoryName ?? 'Alle Buchungen'
  const expenseBarColor = selectedCategory
    ? statisticsData[0]?.color ?? 'var(--color-expense)'
    : 'var(--color-expense)'
  const showChart = hasStatisticsData(statisticsData)
  const rangeLabel = timeRanges.find((r) => r.value === timeRange)?.label

  const totalIncome = statisticsData.reduce((sum, entry) => sum + entry.income, 0)
  const totalExpenses = statisticsData.reduce((sum, entry) => sum + entry.expenses, 0)
  const totalNet = totalIncome - totalExpenses
  const monthsWithData = statisticsData.filter((e) => e.income > 0 || e.expenses > 0).length
  const averageExpenses = monthsWithData > 0 ? totalExpenses / monthsWithData : 0
  const formatMonth = (value: string, month: 'short' | 'long' = 'short') =>
    new Date(value + '-01').toLocaleDateString('de-DE', {
      month,
      year: month === 'short' ? '2-digit' : 'numeric',
    })

  const selectClass = 'block w-full appearance-none rounded-control pr-10 text-sm'

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 md:py-8">
      <PageContextHeader
        title="Statistiken"
        subtitle={`${accountName} · Einnahmen und Ausgaben`}
      />

      <section className="card p-4 md:p-5 mb-4 md:mb-6 space-y-4">
        <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <SegmentedControl
            ariaLabel="Zeitraum"
            className="flex min-w-min sm:inline-flex"
            buttonClassName="shrink-0 px-3.5"
            value={timeRange}
            onChange={setTimeRange}
            options={timeRanges}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="relative">
            <label htmlFor="stats-category" className="eyebrow mb-1 block">
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
              className={selectClass}
            >
              <option value="">Alle Kategorien</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <ChevronDownIcon
              className="pointer-events-none absolute bottom-3.5 right-3 h-4 w-4 text-secondary"
              aria-hidden="true"
            />
          </div>

          <div className="relative">
            <label htmlFor="stats-merchant" className="eyebrow mb-1 block">
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
              className={selectClass}
            >
              <option value="">Alle Händler</option>
              {merchants.map((merchant) => (
                <option key={merchant.id} value={merchant.id}>
                  {merchant.name}
                </option>
              ))}
            </select>
            <ChevronDownIcon
              className="pointer-events-none absolute bottom-3.5 right-3 h-4 w-4 text-secondary"
              aria-hidden="true"
            />
          </div>

          {timeRange === 'custom' && (
            <>
              <div>
                <label htmlFor="stats-start" className="eyebrow mb-1 block">
                  Von
                </label>
                <input
                  id="stats-start"
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="block w-full text-sm"
                />
              </div>
              <div>
                <label htmlFor="stats-end" className="eyebrow mb-1 block">
                  Bis
                </label>
                <input
                  id="stats-end"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="block w-full text-sm"
                />
              </div>
            </>
          )}
        </div>
      </section>

      {showChart && !isLoading && (
        <div className="mb-4 grid grid-cols-2 gap-3 md:mb-6 md:grid-cols-4 md:gap-4">
          <KpiCard label="Einnahmen" subtitle={rangeLabel} amount={totalIncome} stripe="income" />
          <KpiCard label="Ausgaben" subtitle={rangeLabel} amount={totalExpenses} stripe="expense" />
          <KpiCard
            label="Netto"
            subtitle={rangeLabel}
            amount={totalNet}
            stripe={totalNet >= 0 ? 'income' : 'expense'}
            signed
          />
          <KpiCard
            label="Ø Ausgaben"
            subtitle="pro Monat mit Buchungen"
            amount={averageExpenses}
            stripe="accent"
          />
        </div>
      )}

      <section className="card p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-primary">{filterSummary}</h2>
            <p className="text-sm text-secondary">{rangeLabel}</p>
          </div>
          {showChart && !isLoading && (
            <div className="flex items-center gap-2" aria-hidden="true">
              <span className="chip">
                <span className="h-2.5 w-2.5 rounded-full bg-income" />
                Einnahmen
              </span>
              <span className="chip">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: expenseBarColor }}
                />
                Ausgaben
              </span>
            </div>
          )}
        </div>
        <div className="w-full min-w-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-[320px] md:h-[380px]">
              <LoadingSpinner size="md" />
            </div>
          ) : !showChart ? (
            <EmptyState
              title="Keine Daten für die Auswahl"
              description="Wähle eine andere Kategorie, einen anderen Händler oder einen anderen Zeitraum."
            />
          ) : (
            <ChartContainer height={340}>
              <BarChart data={statisticsData} barGap={4} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--color-hairline)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatMonth(String(value))}
                />
                <YAxis
                  tickFormatter={(value) => formatEuro(Number(value))}
                  tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
                  tickLine={false}
                  axisLine={false}
                  width={80}
                />
                <Tooltip
                  formatter={(value, name) => [
                    formatEuro(Number(value ?? 0)),
                    name === 'income' ? 'Einnahmen' : 'Ausgaben',
                  ]}
                  labelFormatter={(label) => {
                    const monthLabel = formatMonth(String(label), 'long')
                    const entry = statisticsData.find((item) => item.date === label)
                    if (!entry) return monthLabel
                    return `${monthLabel} · Saldo ${formatEuro(entry.net)}`
                  }}
                  cursor={{ fill: 'var(--color-surface-muted)', opacity: 0.6 }}
                  contentStyle={{
                    backgroundColor: 'var(--color-surface-raised)',
                    border: '1px solid var(--color-hairline)',
                    borderRadius: '0.75rem',
                    boxShadow: 'var(--shadow-raised)',
                    color: 'var(--text-color)',
                  }}
                  itemStyle={{ color: 'var(--text-color)' }}
                />
                <Bar
                  dataKey="income"
                  name="income"
                  fill="var(--color-income)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="expenses"
                  name="expenses"
                  fill={expenseBarColor}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ChartContainer>
          )}
        </div>
      </section>

      {showChart && !isLoading && (
        <section className="card mt-4 p-4 md:mt-6 md:p-6">
          <h2 className="mb-2 text-base font-semibold text-primary">Monate</h2>
          <ul className="-mx-2">
            {[...statisticsData].reverse().map((entry) => (
              <li
                key={entry.date}
                className="flex items-center gap-3 rounded-control px-2 py-2.5 hover:bg-surface-muted/60"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-primary">
                    {formatMonth(entry.date, 'long')}
                  </span>
                  <span className="block text-sm text-secondary tabular-nums">
                    <span className="text-income">+{formatEuro(entry.income)}</span>
                    {' · '}
                    <span>−{formatEuro(entry.expenses)}</span>
                  </span>
                </span>
                <span
                  className={`amount shrink-0 ${entry.net >= 0 ? 'text-income' : 'text-expense'}`}
                >
                  {entry.net > 0 ? '+' : entry.net < 0 ? '−' : ''}
                  {formatEuro(Math.abs(entry.net))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
