import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  getDefaultCustomPeriodRange,
  isCustomPeriodBlocked,
  parsePeriodFromUrl,
  type TransactionPeriod,
} from '@/lib/transactionPeriodRange'

export type SortField = 'date' | 'merchant' | 'category' | 'description' | 'amount' | 'status'
export type SortDirection = 'asc' | 'desc'

const SORT_FIELDS: SortField[] = ['date', 'merchant', 'category', 'description', 'amount', 'status']

export function buildTransactionsUrl(params: URLSearchParams): string {
  const q = params.toString()
  return q ? `/transactions?${q}` : '/transactions'
}

/** Filter und Sortierung der Buchungsliste – Zustand lebt in der URL (period, from, to, q, sort, dir). */
export function useTransactionFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [sortField, setSortField] = useState<SortField>(() => {
    const s = searchParams.get('sort')
    return SORT_FIELDS.includes(s as SortField) ? (s as SortField) : 'date'
  })
  const [sortDirection, setSortDirection] = useState<SortDirection>(() =>
    searchParams.get('dir') === 'asc' ? 'asc' : 'desc'
  )
  const initialPeriod = parsePeriodFromUrl(searchParams)
  const [period, setPeriod] = useState<TransactionPeriod>(initialPeriod.period)
  const [customStartDate, setCustomStartDate] = useState(initialPeriod.startDate)
  const [customEndDate, setCustomEndDate] = useState(initialPeriod.endDate)
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') ?? '')
  const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get('q') ?? '')

  const customPeriodBlocked = isCustomPeriodBlocked(
    period,
    customStartDate,
    customEndDate
  )

  const syncUrl = useCallback(
    (overrides?: {
      period?: TransactionPeriod
      customStartDate?: string
      customEndDate?: string
      search?: string
      sort?: SortField
      dir?: SortDirection
    }) => {
      const params = new URLSearchParams()
      const nextPeriod = overrides?.period ?? period
      const nextStart = overrides?.customStartDate ?? customStartDate
      const nextEnd = overrides?.customEndDate ?? customEndDate
      const search = overrides?.search ?? debouncedSearch
      const sort = overrides?.sort ?? sortField
      const dir = overrides?.dir ?? sortDirection

      if (nextPeriod !== 'all') params.set('period', nextPeriod)
      if (nextPeriod === 'custom' && nextStart) params.set('from', nextStart)
      if (nextPeriod === 'custom' && nextEnd) params.set('to', nextEnd)
      if (search.trim()) params.set('q', search.trim())
      if (sort !== 'date') params.set('sort', sort)
      if (dir !== 'desc') params.set('dir', dir)

      router.replace(buildTransactionsUrl(params), { scroll: false })
    },
    [
      router,
      period,
      customStartDate,
      customEndDate,
      debouncedSearch,
      sortField,
      sortDirection,
    ]
  )

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  useEffect(() => {
    const currentQ = searchParams.get('q') ?? ''
    if (debouncedSearch === currentQ) return
    syncUrl({ search: debouncedSearch })
  }, [debouncedSearch, searchParams, syncUrl])

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        const nextDir = sortDirection === 'asc' ? 'desc' : 'asc'
        setSortDirection(nextDir)
        syncUrl({ sort: field, dir: nextDir })
      } else {
        setSortField(field)
        setSortDirection('desc')
        syncUrl({ sort: field, dir: 'desc' })
      }
    },
    [sortField, sortDirection, syncUrl]
  )

  const changePeriod = (nextPeriod: TransactionPeriod) => {
    setPeriod(nextPeriod)
    if (
      nextPeriod === 'custom' &&
      !customStartDate &&
      !customEndDate
    ) {
      const defaults = getDefaultCustomPeriodRange()
      setCustomStartDate(defaults.startDate)
      setCustomEndDate(defaults.endDate)
      syncUrl({
        period: nextPeriod,
        customStartDate: defaults.startDate,
        customEndDate: defaults.endDate,
      })
      return
    }
    syncUrl({ period: nextPeriod })
  }

  const changeCustomRange = (startDate: string, endDate: string) => {
    setCustomStartDate(startDate)
    setCustomEndDate(endDate)
    syncUrl({
      period: 'custom',
      customStartDate: startDate,
      customEndDate: endDate,
    })
  }

  const resetFilters = () => {
    setPeriod('all')
    setCustomStartDate('')
    setCustomEndDate('')
    setSearchQuery('')
    syncUrl({
      period: 'all',
      customStartDate: '',
      customEndDate: '',
      search: '',
    })
  }

  return {
    period,
    customStartDate,
    customEndDate,
    customPeriodBlocked,
    searchQuery,
    setSearchQuery,
    debouncedSearch,
    sortField,
    sortDirection,
    handleSort,
    changePeriod,
    changeCustomRange,
    resetFilters,
  }
}
