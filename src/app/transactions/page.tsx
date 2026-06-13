'use client'

import { Suspense, useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PlusIcon } from '@heroicons/react/24/outline'
import { Transaction } from '@/types'
import { getTransactions, getTransactionTotals, updateTransaction, createRecurringInstance, createPendingInstances } from '@/lib/api'
import { isTransactionDueInSalaryMonth } from '@/lib/dateUtils'
import {
  getDefaultCustomPeriodRange,
  isCustomPeriodBlocked,
  isPeriodFilterActive,
  parsePeriodFromUrl,
  type TransactionPeriod,
} from '@/lib/transactionPeriodRange'
import TransactionList from '@/components/TransactionList'
import TransactionPeriodFilter from '@/components/TransactionPeriodFilter'
import MonthlyOverview from '@/components/MonthlyOverview'
import Modal from '@/components/Modal'
import TransactionForm from '@/components/TransactionForm'
import EditTransactionForm from '@/components/EditTransactionForm'
import { useToast } from '@/hooks/useToast'
import { Button } from '@/components/Button'
import TransactionCsvImport from '@/components/TransactionCsvImport'
import PageLoader from '@/components/PageLoader'
import PageError from '@/components/PageError'
import LoadingSpinner from '@/components/LoadingSpinner'
import SalaryMonthHint from '@/components/SalaryMonthHint'
import PageContextHeader from '@/components/PageContextHeader'
import { useUserSettings } from '@/hooks/useUserSettings'
import { useActiveAccountReload } from '@/hooks/useActiveAccountReload'

type SortField = 'date' | 'merchant' | 'category' | 'description' | 'amount' | 'status'
type SortDirection = 'asc' | 'desc'

const SORT_FIELDS: SortField[] = ['date', 'merchant', 'category', 'description', 'amount', 'status']

function buildTransactionsUrl(params: URLSearchParams): string {
  const q = params.toString()
  return q ? `/transactions?${q}` : '/transactions'
}

function TransactionsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { salaryDay, accountName, loading: settingsLoading, canWrite, isSimpleAccount } = useUserSettings()
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
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
  const { showToast } = useToast()

  const [showNewTransactionModal, setShowNewTransactionModal] = useState(false)
  const [isCreatingPending, setIsCreatingPending] = useState(false)
  const [showEditTransactionModal, setShowEditTransactionModal] = useState(false)
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null)

  const customPeriodBlocked = isCustomPeriodBlocked(
    period,
    customStartDate,
    customEndDate
  )

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

  useEffect(() => {
    if (salaryDay === null) return
    if (customPeriodBlocked) {
      setLoading(false)
      setTransactions([])
      setHasMore(false)
      setPage(1)
      return
    }
    loadTransactions(1, false)
  }, [salaryDay, debouncedSearch, period, customStartDate, customEndDate, customPeriodBlocked])

  useActiveAccountReload(() => {
    if (salaryDay !== null && !customPeriodBlocked) {
      loadTransactions(1, false)
      loadTotals()
    }
  })

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())

    if (searchParams.get('new') === '1') {
      setShowNewTransactionModal(true)
      params.delete('new')
      router.replace(buildTransactionsUrl(params), { scroll: false })
    }

    const editId = searchParams.get('edit')
    if (editId) {
      setSelectedTransactionId(editId)
      setShowEditTransactionModal(true)
      params.delete('edit')
      router.replace(buildTransactionsUrl(params), { scroll: false })
    }
  }, [searchParams, router])

  useEffect(() => {
    if (salaryDay === null) return
    loadTotals()
  }, [salaryDay, period, customStartDate, customEndDate])

  const loadTotals = async () => {
    if (salaryDay === null) return
    try {
      const data = await getTransactionTotals({
        period,
        startDate: period === 'custom' ? customStartDate : undefined,
        endDate: period === 'custom' ? customEndDate : undefined,
        salaryDay,
      })
      setTotals(data)
      setPeriodLabel(data.periodLabel ?? null)
    } catch (err) {
      console.error('Error loading totals:', err)
    }
  }

  const loadTransactions = async (pageNum: number, append = false) => {
    if (customPeriodBlocked) return
    try {
      setLoading(true)
      const response = await getTransactions(pageNum, 20, periodQuery())
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
    } catch (err) {
      setError('Fehler beim Laden der Transaktionen')
      showToast('Fehler beim Laden der Transaktionen', 'error')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

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
  }, [hasMore, loading, page, period, customStartDate, customEndDate, salaryDay, debouncedSearch, customPeriodBlocked])

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

  const handleTransactionChange = useCallback(async () => {
    await loadTotals()
    await loadTransactions(page, false)
  }, [page, salaryDay, period, customStartDate, customEndDate, debouncedSearch, customPeriodBlocked])

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

  const handleCreatePending = async () => {
    setIsCreatingPending(true)
    try {
      await createPendingInstances()
      await handleTransactionChange()
      showToast('Ausstehende Zahlungen erstellt', 'success')
    } catch (err) {
      console.error('Error creating pending instances:', err)
      setError('Fehler beim Erstellen der ausstehenden Zahlungen')
      showToast('Fehler beim Erstellen der ausstehenden Zahlungen', 'error')
    } finally {
      setIsCreatingPending(false)
    }
  }

  const handleEditTransaction = (id: string) => {
    setSelectedTransactionId(id)
    setShowEditTransactionModal(true)
  }

  const handleEditTransactionSuccess = async () => {
    setShowEditTransactionModal(false)
    setSelectedTransactionId(null)
    await handleTransactionChange()
  }

  const handleNewTransactionSuccess = async () => {
    setShowNewTransactionModal(false)
    await handleTransactionChange()
  }

  const isTransactionPending = (transaction: Transaction) => {
    if (salaryDay === null) return false
    return (
      transaction.isRecurring &&
      isTransactionDueInSalaryMonth(
        {
          date: new Date(transaction.date),
          isRecurring: transaction.isRecurring,
          recurringInterval: transaction.recurringInterval,
          lastConfirmedDate: transaction.lastConfirmedDate
            ? new Date(transaction.lastConfirmedDate)
            : undefined,
        },
        salaryDay
      ) &&
      !transaction.isConfirmed
    )
  }

  const hasPendingInList = transactions.some(isTransactionPending)
  const showPendingAction = !isSimpleAccount && canWrite && (totals.totalPendingExpenses > 0 || hasPendingInList)

  if ((loading || settingsLoading) && transactions.length === 0 && !error) {
    return <PageLoader message="Transaktionen werden geladen…" />
  }

  if (error && transactions.length === 0) {
    return (
      <PageError
        message={error}
        onRetry={() => {
          setError(null)
          loadTransactions(1, false)
        }}
      />
    )
  }

  return (
    <div id="transaction-page" className="min-h-screen bg-canvas pb-24 md:pb-8">
      <div id="transaction-container" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && transactions.length > 0 && (
          <div
            id="error-message"
            className="mb-4 p-4 bg-danger-subtle text-danger rounded-card border border-danger/20"
            role="alert"
          >
            {error}
          </div>
        )}

        <PageContextHeader
          title={accountName}
          subtitle={
            isSimpleAccount
              ? 'Transaktionen · Kalendermonat'
              : 'Transaktionen · Gehaltsmonat'
          }
          actions={
            <>
              {showPendingAction && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleCreatePending}
                  loading={isCreatingPending}
                  loadingText="Wird erstellt…"
                  title="Erstellt Buchungen für fällige wiederkehrende Zahlungen im aktuellen Gehaltsmonat"
                  aria-label="Ausstehende Zahlungen für den Gehaltsmonat erstellen"
                >
                  Ausstehende erstellen
                </Button>
              )}
              {canWrite && (
                <>
                  <TransactionCsvImport
                    onImported={() => loadTransactions(1, false)}
                  />
                  <Button
                    type="button"
                    className="hidden md:inline-flex shrink-0"
                    onClick={() => setShowNewTransactionModal(true)}
                  >
                    Neue Transaktion
                  </Button>
                </>
              )}
            </>
          }
        />
        {salaryDay !== null && !isSimpleAccount && (
          <div className="mb-4 -mt-2">
            <SalaryMonthHint
              salaryDay={salaryDay}
              filterActive={period === 'current'}
            />
          </div>
        )}

        {salaryDay !== null && (
          <TransactionPeriodFilter
            period={period}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
            isSimpleAccount={isSimpleAccount}
            salaryDay={salaryDay}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onPeriodChange={(nextPeriod) => {
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
            }}
            onCustomRangeChange={(startDate, endDate) => {
              setCustomStartDate(startDate)
              setCustomEndDate(endDate)
              syncUrl({
                period: 'custom',
                customStartDate: startDate,
                customEndDate: endDate,
              })
            }}
            onReset={() => {
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
            }}
          />
        )}

        <div
          id="monthly-overview-section"
          className="rounded-lg border border-border p-4 mb-8 bg-surface"
        >
          <MonthlyOverview
            currentIncome={totals.currentIncome}
            currentExpenses={totals.currentExpenses}
            clearedBalance={totals.clearedBalance}
            totalPendingExpenses={totals.totalPendingExpenses}
            available={totals.available}
            hidePendingMetrics={isSimpleAccount}
            incomeSubtitle={periodLabel ?? (isSimpleAccount ? 'Kalendermonat' : 'Gehaltsmonat')}
            balanceSubtitle="Gebucht"
          />
        </div>

        <div
          id="transaction-list-section"
          className="rounded-lg border border-border p-4 mb-8 bg-surface"
        >
          <TransactionList
            transactions={transactions}
            onTransactionChange={handleTransactionChange}
            onToggleConfirmation={canWrite ? handleToggleConfirmation : undefined}
            togglingTransactionIds={togglingTransactionIds}
            lastElementRef={lastElementRef}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            salaryDay={salaryDay}
            onAddTransaction={canWrite ? () => setShowNewTransactionModal(true) : undefined}
            onEditTransaction={canWrite ? handleEditTransaction : undefined}
            isSearchActive={debouncedSearch.trim().length > 0}
            isPeriodFilterActive={isPeriodFilterActive(period)}
            readOnly={!canWrite}
          />
          {hasMore && (
            <div ref={loadingRef} className="flex justify-center items-center gap-2 mt-8">
              <LoadingSpinner size="sm" />
              <span className="text-sm text-secondary">
                Weitere Transaktionen werden geladen…
              </span>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showNewTransactionModal}
        onClose={() => setShowNewTransactionModal(false)}
        title="Neue Transaktion"
        maxWidth="md"
      >
        <TransactionForm
          onSuccess={handleNewTransactionSuccess}
          onCancel={() => setShowNewTransactionModal(false)}
          hideRecurring={isSimpleAccount}
        />
      </Modal>

      <Modal
        isOpen={showEditTransactionModal}
        onClose={() => setShowEditTransactionModal(false)}
        title="Transaktion bearbeiten"
        maxWidth="md"
      >
        {selectedTransactionId && (
          <EditTransactionForm
            id={selectedTransactionId}
            onSuccess={handleEditTransactionSuccess}
            onCancel={() => setShowEditTransactionModal(false)}
            hideRecurring={isSimpleAccount}
          />
        )}
      </Modal>

      {canWrite && (
      <Button
        type="button"
        className="md:hidden fixed bottom-6 right-6 z-30 h-14 w-14 min-w-14 rounded-full p-0 shadow-lg"
        onClick={() => setShowNewTransactionModal(true)}
        aria-label="Neue Transaktion"
      >
        <PlusIcon className="h-6 w-6" aria-hidden="true" />
      </Button>
      )}
    </div>
  )
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<PageLoader message="Transaktionen werden geladen…" />}>
      <TransactionsPageContent />
    </Suspense>
  )
}
