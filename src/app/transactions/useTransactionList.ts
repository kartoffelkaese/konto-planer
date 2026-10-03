import { useState, useEffect, useRef, useCallback } from 'react'
import { Transaction } from '@/types'
import { getTransactions, getTransactionTotals, updateTransaction } from '@/lib/api'
import type { TransactionPeriod } from '@/lib/transactionPeriodRange'
import { useToast } from '@/hooks/useToast'

type TransactionListParams = {
  salaryDay: number | null
  period: TransactionPeriod
  customStartDate: string
  customEndDate: string
  debouncedSearch: string
  customPeriodBlocked: boolean
}

/** Buchungsliste mit Nachladen beim Scrollen, Summen des Zeitraums und Bestätigen einzelner Buchungen. */
export function useTransactionList({
  salaryDay,
  period,
  customStartDate,
  customEndDate,
  debouncedSearch,
  customPeriodBlocked,
}: TransactionListParams) {
  const { showToast } = useToast()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingState, setLoading] = useState(true)
  /** Filter, für die die Liste zuletzt geladen wurde (siehe filterKey) */
  const [loadedFilterKey, setLoadedFilterKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [periodLabel, setPeriodLabel] = useState<string | null>(null)
  const [totals, setTotals] = useState({
    currentIncome: 0,
    currentExpenses: 0,
    totalIncome: 0,
    totalExpenses: 0,
    clearedBalance: 0,
    totalPendingExpenses: 0,
    available: 0,
  })
  const observer = useRef<IntersectionObserver | null>(null)
  const loadingRef = useRef<HTMLDivElement>(null)
  const [togglingTransactionIds, setTogglingTransactionIds] = useState<string[]>([])

  const periodQuery = useCallback(
    () => ({
      period,
      startDate: period === 'custom' ? customStartDate : undefined,
      endDate: period === 'custom' ? customEndDate : undefined,
      salaryDay,
      search: debouncedSearch,
    }),
    [period, customStartDate, customEndDate, salaryDay, debouncedSearch]
  )

  // Kennzeichnet die aktuelle Filterkombination; solange sie noch nicht geladen ist, gilt die Liste als ladend
  const filterKey = JSON.stringify([salaryDay, debouncedSearch, period, customStartDate, customEndDate])
  const loading =
    loadingState || (salaryDay !== null && !customPeriodBlocked && loadedFilterKey !== filterKey)

  // Unvollständiger eigener Zeitraum: Liste leeren statt laden (Abgleich beim Rendern statt im Effekt)
  const [prevPeriodBlocked, setPrevPeriodBlocked] = useState(false)
  if (prevPeriodBlocked !== customPeriodBlocked) {
    setPrevPeriodBlocked(customPeriodBlocked)
    if (customPeriodBlocked) {
      setLoading(false)
      setTransactions([])
      setHasMore(false)
      setPage(1)
    }
  }

  const loadTotals = useCallback(() => {
    if (salaryDay === null) return Promise.resolve()
    return getTransactionTotals({
      period,
      startDate: period === 'custom' ? customStartDate : undefined,
      endDate: period === 'custom' ? customEndDate : undefined,
      salaryDay,
    }).then(
      (data) => {
        setTotals(data)
        setPeriodLabel(data.periodLabel ?? null)
      },
      (err: unknown) => console.error('Error loading totals:', err)
    )
  }, [salaryDay, period, customStartDate, customEndDate])

  /** Lädt eine Seite, ohne vorher den Ladezustand zu setzen (für den Filter-Effekt) */
  const fetchTransactionPage = useCallback(
    (pageNum: number, append: boolean) =>
      getTransactions(pageNum, 20, periodQuery())
        .then(
          (response) => {
            const data = response.transactions.map((t) => ({
              ...t,
              amount: Number(t.amount),
            }))

            setTransactions((prev) => {
              if (!append) return data
              const existingIds = new Set(prev.map((t) => t.id))
              const newTransactions = data.filter((t) => !existingIds.has(t.id))
              return [...prev, ...newTransactions]
            })
            setHasMore(response.hasMore)
            setError(null)
            setPage(pageNum)
          },
          (err: unknown) => {
            setError('Fehler beim Laden der Transaktionen')
            showToast('Fehler beim Laden der Transaktionen', 'error')
            console.error(err)
          }
        )
        .finally(() => {
          setLoading(false)
          setLoadedFilterKey(filterKey)
        }),
    [periodQuery, showToast, filterKey]
  )

  /** Lädt eine Seite mit Ladeanzeige (Nachladen, Neuladen nach Änderungen) */
  const loadTransactions = useCallback(
    (pageNum: number, append = false) => {
      if (customPeriodBlocked) return Promise.resolve()
      setLoading(true)
      return fetchTransactionPage(pageNum, append)
    },
    [customPeriodBlocked, fetchTransactionPage]
  )

  // Filter geändert (Suche, Zeitraum, Gehaltstag): erste Seite laden
  useEffect(() => {
    if (salaryDay === null || customPeriodBlocked) return
    void fetchTransactionPage(1, false)
  }, [salaryDay, customPeriodBlocked, fetchTransactionPage])

  useEffect(() => {
    if (salaryDay === null) return
    void loadTotals()
  }, [salaryDay, loadTotals])

  useEffect(() => {
    if (!loadingRef.current) return

    const options = {
      root: null,
      rootMargin: '20px',
      threshold: 0.1,
    }

    observer.current = new IntersectionObserver((entries) => {
      const [entry] = entries
      if (entry.isIntersecting && hasMore && !loading) {
        loadTransactions(page + 1, true)
      }
    }, options)

    observer.current.observe(loadingRef.current)

    return () => {
      observer.current?.disconnect()
    }
  }, [hasMore, loading, page, loadTransactions])

  const lastElementRef = useCallback(() => {}, [])

  const handleToggleConfirmation = async (transaction: Transaction) => {
    const previous = transaction
    const newConfirmed = !transaction.isConfirmed
    const currentDate = new Date().toISOString()

    setTransactions((prev) =>
      prev.map((t) =>
        t.id === transaction.id
          ? {
              ...t,
              isConfirmed: newConfirmed,
              lastConfirmedDate: newConfirmed ? currentDate : null,
            }
          : t
      )
    )
    setTogglingTransactionIds((prev) => [...prev, transaction.id])

    try {
      const updatedTransaction = await updateTransaction(transaction.id, {
        isConfirmed: newConfirmed,
        lastConfirmedDate: newConfirmed ? currentDate : null,
      })

      if (transaction.parentTransactionId) {
        await updateTransaction(transaction.parentTransactionId, {
          lastConfirmedDate: currentDate,
        }).catch(() => {
          console.error('Fehler beim Aktualisieren der Eltern-Transaktion')
        })
      }

      setTransactions((prev) =>
        prev.map((t) =>
          t.id === updatedTransaction.id
            ? { ...updatedTransaction, amount: Number(updatedTransaction.amount) }
            : t
        )
      )
      showToast(
        newConfirmed ? 'Als bestätigt markiert' : 'Bestätigung aufgehoben',
        'success'
      )
      await loadTotals()
    } catch (err) {
      setTransactions((prev) =>
        prev.map((t) => (t.id === previous.id ? previous : t))
      )
      showToast('Status konnte nicht geändert werden', 'error')
      console.error('Fehler beim Aktualisieren der Transaktion:', err)
    } finally {
      setTogglingTransactionIds((prev) => prev.filter((id) => id !== transaction.id))
    }
  }

  return {
    transactions,
    loading,
    error,
    setError,
    page,
    hasMore,
    totals,
    periodLabel,
    loadingRef,
    lastElementRef,
    togglingTransactionIds,
    loadTotals,
    loadTransactions,
    handleToggleConfirmation,
  }
}
