'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts'
import { 
  ChevronDownIcon
} from '@heroicons/react/24/outline'

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
  amount: number
  category: string
  color: string
}

export default function StatisticsPage() {
  const { data: session } = useSession()
  const [categories, setCategories] = useState<Category[]>([])
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedMerchant, setSelectedMerchant] = useState<string>('')
  const [timeRange, setTimeRange] = useState<string>('3months')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [statisticsData, setStatisticsData] = useState<StatisticsData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Zeitraum-Optionen
  const timeRanges = [
    { value: '1month', label: 'Letzter Monat' },
    { value: '3months', label: 'Letzte 3 Monate' },
    { value: '6months', label: 'Letzte 6 Monate' },
    { value: '1year', label: 'Letztes Jahr' },
    { value: 'custom', label: 'Benutzerdefiniert' }
  ]

  useEffect(() => {
    if (session) {
      fetchCategories()
      fetchMerchants()
    }
  }, [session])

  useEffect(() => {
    if (selectedCategory || selectedMerchant) {
      fetchStatistics()
    }
  }, [selectedCategory, selectedMerchant, timeRange, customStartDate, customEndDate])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()
      // Kategorien alphabetisch sortieren
      const sortedCategories = data.sort((a: Category, b: Category) => 
        a.name.localeCompare(b.name, 'de')
      )
      setCategories(sortedCategories)
      // Erste Kategorie als Standard auswählen
      if (sortedCategories.length > 0) {
        setSelectedCategory(sortedCategories[0].id)
      }
    } catch (error) {
      console.error('Fehler beim Laden der Kategorien:', error)
    }
  }

  const fetchMerchants = async () => {
    try {
      const response = await fetch('/api/merchants')
      const data = await response.json()
      // Händler alphabetisch sortieren
      const sortedMerchants = data.sort((a: Merchant, b: Merchant) => 
        a.name.localeCompare(b.name, 'de')
      )
      setMerchants(sortedMerchants)
    } catch (error) {
      console.error('Fehler beim Laden der Händler:', error)
    }
  }

  const fetchStatistics = async () => {
    setIsLoading(true)
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
    } finally {
      setIsLoading(false)
    }
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Bitte melden Sie sich an</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Um die Statistiken zu sehen, müssen Sie angemeldet sein.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 md:mb-0">Statistiken</h1>
        
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          {/* Kategorie-Auswahl */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value)
                if (e.target.value) {
                  setSelectedMerchant('') // Wenn eine Kategorie ausgewählt wird, Händler zurücksetzen
                }
              }}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-dark-lighter focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md appearance-none bg-white dark:bg-dark-light text-gray-900 dark:text-white"
            >
              <option value="">Alle Kategorien</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
              <ChevronDownIcon className="h-4 w-4" />
            </div>
          </div>

          {/* Händler-Auswahl */}
          <div className="relative">
            <select
              value={selectedMerchant}
              onChange={(e) => {
                setSelectedMerchant(e.target.value)
                if (e.target.value) {
                  setSelectedCategory('') // Wenn ein Händler ausgewählt wird, Kategorie zurücksetzen
                }
              }}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-dark-lighter focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md appearance-none bg-white dark:bg-dark-light text-gray-900 dark:text-white"
            >
              <option value="">Alle Händler</option>
              {merchants.map((merchant) => (
                <option key={merchant.id} value={merchant.id}>
                  {merchant.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
              <ChevronDownIcon className="h-4 w-4" />
            </div>
          </div>

          {/* Zeitraum-Auswahl */}
          <div className="relative">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-dark-lighter focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md appearance-none bg-white dark:bg-dark-light text-gray-900 dark:text-white"
            >
              {timeRanges.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
              <ChevronDownIcon className="h-4 w-4" />
            </div>
          </div>

          {/* Benutzerdefinierte Datumsauswahl */}
          {timeRange === 'custom' && (
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-dark-lighter focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-dark-light text-gray-900 dark:text-white"
                />
              </div>
              <div className="relative">
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-dark-lighter focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-dark-light text-gray-900 dark:text-white"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grafik */}
      <div className="bg-white dark:bg-dark-light rounded-lg shadow dark:shadow-dark p-4 md:p-6">
        <div className="h-[400px] -mx-4 md:mx-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statisticsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12, fill: 'var(--text-color)' }}
                  tickFormatter={(value) => {
                    const date = new Date(value + '-01')
                    return date.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
                  }}
                  stroke="var(--text-color)"
                />
                <YAxis 
                  tickFormatter={(value) => `${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€`}
                  tick={{ fontSize: 12, fill: 'var(--text-color)' }}
                  stroke="var(--text-color)"
                />
                <Tooltip 
                  formatter={(value: number) => [`${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€`, 'Ausgaben']}
                  labelFormatter={(label) => {
                    const date = new Date(label + '-01')
                    return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
                  }}
                  contentStyle={{ 
                    backgroundColor: 'var(--card-bg)', 
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.5rem',
                    color: 'var(--text-color)'
                  }}
                  itemStyle={{ color: 'var(--text-color)' }}
                />
                <Bar 
                  dataKey="amount" 
                  fill="#2563eb"
                  radius={[4, 4, 0, 0]}
                >
                  {statisticsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
} 