'use client'

import { Suspense, useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { Transaction } from '@/types'
import { getTransactions, updateTransaction, createRecurringInstance, createPendingInstances } from '@/lib/api'
import { isTransactionDueInSalaryMonth } from '@/lib/dateUtils'
import TransactionList from '@/components/TransactionList'
import MonthlyOverview from '@/components/MonthlyOverview'
import Modal from '@/components/Modal'
import TransactionForm from '@/components/TransactionForm'
import EditTransactionForm from '@/components/EditTransactionForm'
import { useToast } from '@/hooks/useToast'
import { Button } from '@/components/Button'
import PageLoader from '@/components/PageLoader'
import PageError from '@/components/PageError'
import LoadingSpinner from '@/components/LoadingSpinner'
import SalaryMonthHint from '@/components/SalaryMonthHint'
import { useUserSettings } from '@/hooks/useUserSettings'

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
  const { salaryDay, accountName, loading: settingsLoading } = useUserSettings()
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [sortField, setSortField] = useState<SortField>(() => {
    const s = searchParams.get('sort')
    return SORT_FIELDS.includes(s as SortField) ? (s as SortField) : 'date'
  })
  const [sortDirection, setSortDirection] = useState<SortDirection>(() =>
    searchParams.get('dir') === 'asc' ? 'asc' : 'desc'
  )
  const [filterSalaryMonth, setFilterSalaryMonth] = useState(
    () => searchParams.get('filterSalaryMonth') === '1'
  )
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') ?? '')
  const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get('q') ?? '')
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

  const syncUrl = useCallback(
    (overrides?: {
      filterSalaryMonth?: boolean
      search?: string
      sort?: SortField
      dir?: SortDirection
    }) => {
      const params = new URLSearchParams()
      const filter = overrides?.filterSalaryMonth ?? filterSalaryMonth
      const search = overrides?.search ?? debouncedSearch
      const sort = overrides?.sort ?? sortField
      const dir = overrides?.dir ?? sortDirection

      if (filter) params.set('filterSalaryMonth', '1')
      if (search.trim()) params.set('q', search.trim())
      if (sort !== 'date') params.set('sort', sort)
      if (dir !== 'desc') params.set('dir', dir)

      router.replace(buildTransactionsUrl(params), { scroll: false })
    },
    [router, filterSalaryMonth, debouncedSearch, sortField, sortDirection]
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
    if (salaryDay !== null) {
      loadTransactions(1, false)
    }
  }, [salaryDay, debouncedSearch, filterSalaryMonth])

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
  }, [salaryDay])

  const loadTotals = async () => {
    if (salaryDay === null) return
    try {
      const response = await fetch('/api/transactions/totals')
      if (response.ok) {
        const data = await response.json()
        setTotals(data)
      }
    } catch (err) {
      console.error('Error loading totals:', err)
    }
  }

  const loadTransactions = async (pageNum: number, append = false) => {
    try {
      setLoading(true)
      const response = await getTransactions(pageNum, 20, {
        salaryDay: salaryDay,
        filterSalaryMonth: filterSalaryMonth,
        search: debouncedSearch,
      })
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
  }, [hasMore, loading, page, filterSalaryMonth, salaryDay, debouncedSearch])

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
  }, [page, salaryDay, filterSalaryMonth, debouncedSearch])

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
  const showPendingAction = totals.totalPendingExpenses > 0 || hasPendingInList

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

        <div
          id="page-header"
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 mb-4"
        >
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="page-title">{accountName}</h1>
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
            </div>
            {salaryDay !== null && (
              <div className="mt-2">
                <SalaryMonthHint
                  salaryDay={salaryDay}
                  filterActive={filterSalaryMonth}
                />
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <label className="flex items-center space-x-2 shrink-0">
              <input
                type="checkbox"
                checked={filterSalaryMonth}
                onChange={(e) => {
                  const checked = e.target.checked
                  setFilterSalaryMonth(checked)
                  syncUrl({ filterSalaryMonth: checked })
                }}
                className="rounded border-border text-accent focus:ring-accent bg-surface"
              />
              <span className="text-sm text-primary">Nur Gehaltsmonat</span>
            </label>
            <Button
              type="button"
              className="hidden md:inline-flex shrink-0"
              onClick={() => setShowNewTransactionModal(true)}
            >
              Neue Transaktion
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <label htmlFor="transaction-search" className="sr-only">
            Transaktionen durchsuchen
          </label>
          <div className="flex items-center gap-3 w-full rounded-control border border-border bg-surface px-3 py-2 shadow-sm focus-within:border-accent focus-within:outline focus-within:outline-2 focus-within:outline-accent-subtle focus-within:outline-offset-1">
            <MagnifyingGlassIcon
              className="h-5 w-5 shrink-0 text-secondary"
              aria-hidden="true"
            />
            <input
              id="transaction-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Händler oder Beschreibung suchen…"
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-primary shadow-none focus:outline-none focus:ring-0"
            />
          </div>
        </div>

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
          />
        </div>

        <div
          id="transaction-list-section"
          className="rounded-lg border border-border p-4 mb-8 bg-surface"
        >
          <TransactionList
            transactions={transactions}
            onTransactionChange={handleTransactionChange}
            onToggleConfirmation={handleToggleConfirmation}
            togglingTransactionIds={togglingTransactionIds}
            lastElementRef={lastElementRef}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            salaryDay={salaryDay}
            onAddTransaction={() => setShowNewTransactionModal(true)}
            onEditTransaction={handleEditTransaction}
            isSearchActive={debouncedSearch.trim().length > 0}
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
          />
        )}
      </Modal>

      <Button
        type="button"
        className="md:hidden fixed bottom-6 right-6 z-30 h-14 w-14 min-w-14 rounded-full p-0 shadow-lg"
        onClick={() => setShowNewTransactionModal(true)}
        aria-label="Neue Transaktion"
      >
        <PlusIcon className="h-6 w-6" aria-hidden="true" />
      </Button>
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
