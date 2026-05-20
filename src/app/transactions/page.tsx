'use client'

import { Suspense, useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PlusIcon } from '@heroicons/react/24/outline'
import { Transaction } from '@/types'
import { getTransactions, updateTransaction, createRecurringInstance, createPendingInstances } from '@/lib/api'
import { isTransactionDueInSalaryMonth, getSalaryMonthRange } from '@/lib/dateUtils'
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

type SortField = 'date' | 'merchant' | 'category' | 'description' | 'amount' | 'status'
type SortDirection = 'asc' | 'desc'

function TransactionsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [salaryDay, setSalaryDay] = useState<number | null>(null)
  const [accountName, setAccountName] = useState('Mein Konto')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [filterSalaryMonth, setFilterSalaryMonth] = useState(false)
  const [totals, setTotals] = useState<{
    currentIncome: number
    currentExpenses: number
    totalIncome: number
    totalExpenses: number
    totalPendingExpenses: number
    available: number
  }>({
    currentIncome: 0,
    currentExpenses: 0,
    totalIncome: 0,
    totalExpenses: 0,
    totalPendingExpenses: 0,
    available: 0
  })
  const observer = useRef<IntersectionObserver | null>(null)
  const loadingRef = useRef<HTMLDivElement>(null)
  const [togglingTransactionIds, setTogglingTransactionIds] = useState<string[]>([])
  const { showToast } = useToast()

  // Modal states
  const [showNewTransactionModal, setShowNewTransactionModal] = useState(false)
  const [isCreatingPending, setIsCreatingPending] = useState(false)
  const [showEditTransactionModal, setShowEditTransactionModal] = useState(false)
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      await loadSettings()
      loadTransactions(1)
    }
    init()
  }, [])

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowNewTransactionModal(true)
      router.replace('/transactions', { scroll: false })
    }
  }, [searchParams, router])

  useEffect(() => {
    if (salaryDay === null) return
    loadTotals()
  }, [salaryDay])

  useEffect(() => {
    if (salaryDay !== null) {
      // Beim Ändern des Filters zurück zur ersten Seite und Transaktionen neu laden
      setPage(1)
      setTransactions([])
      loadTransactions(1, false)
    }
  }, [filterSalaryMonth, salaryDay])

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/users/settings')
      if (response.ok) {
        const data = await response.json()
        setSalaryDay(data.salaryDay)
        setAccountName(data.accountName || 'Mein Konto')
      }
    } catch (err) {
      console.error('Error loading settings:', err)
    }
  }

  const loadTotals = async () => {
    if (salaryDay === null) return
    try {
      const response = await fetch(`/api/transactions/totals?salaryDay=${salaryDay}`)
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
        filterSalaryMonth: filterSalaryMonth
      })
      const data = response.transactions.map(t => ({
        ...t,
        amount: Number(t.amount)
      }))
      
      setTransactions(prev => {
        if (!append) return data
        // Erstelle ein Set aus den IDs der vorhandenen Transaktionen
        const existingIds = new Set(prev.map(t => t.id))
        // Filtere neue Transaktionen, die noch nicht im State sind
        const newTransactions = data.filter(t => !existingIds.has(t.id))
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
      threshold: 0.1
    }

    observer.current = new IntersectionObserver((entries) => {
      const [entry] = entries
      if (entry.isIntersecting && hasMore && !loading) {
        loadTransactions(page + 1, true)
      }
    }, options)

    observer.current.observe(loadingRef.current)

    return () => {
      if (observer.current) {
        observer.current.disconnect()
      }
    }
  }, [hasMore, loading, page, filterSalaryMonth, salaryDay])

  // Leere Funktion für die Kompatibilität mit TransactionList
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

  const handleCreateInstance = async (transaction: Transaction) => {
    try {
      const newTransaction = await createRecurringInstance(transaction.id)
      setTransactions([...transactions, {
        ...newTransaction,
        amount: Number(newTransaction.amount)
      }])
    } catch (err) {
      console.error('Fehler beim Erstellen der Transaktion:', err)
    }
  }

  const handleTransactionChange = useCallback(async () => {
    await loadTotals()
    await loadTransactions(page)
  }, [page, salaryDay, filterSalaryMonth])

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      // Set new field with default direction
      setSortField(field)
      setSortDirection('desc')
    }
  }, [sortField])

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
    return transaction.isRecurring && 
           isTransactionDueInSalaryMonth({
             date: new Date(transaction.date),
             isRecurring: transaction.isRecurring,
             recurringInterval: transaction.recurringInterval,
             lastConfirmedDate: transaction.lastConfirmedDate ? new Date(transaction.lastConfirmedDate) : undefined
           }, salaryDay) && 
           !transaction.isConfirmed
  }

  const hasPendingInList = transactions.some(isTransactionPending)
  const showPendingAction =
    totals.totalPendingExpenses > 0 || hasPendingInList

  if (loading && transactions.length === 0 && !error) {
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

        <div id="page-header" className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 mb-8">
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
            <p className="mt-1 page-subtitle">
              Verwalten Sie Ihre Ein- und Ausgaben
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={filterSalaryMonth}
                onChange={(e) => setFilterSalaryMonth(e.target.checked)}
                className="rounded border-border text-accent focus:ring-accent bg-surface"
              />
              <span className="text-sm text-primary">
                Nur Gehaltsmonat
              </span>
            </label>
          <Button
            type="button"
            className="hidden md:inline-flex"
            onClick={() => setShowNewTransactionModal(true)}
          >
            Neue Transaktion
          </Button>
          </div>
        </div>

        <div id="monthly-overview-section" className="rounded-lg border border-border p-4 mb-8 bg-surface">
          <MonthlyOverview 
            currentIncome={totals.currentIncome}
            currentExpenses={totals.currentExpenses}
            totalIncome={totals.totalIncome}
            totalExpenses={totals.totalExpenses}
            totalPendingExpenses={totals.totalPendingExpenses}
            available={totals.available}
          />
        </div>

        <div id="transaction-list-section" className="rounded-lg border border-border p-4 mb-8 bg-surface">
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
          />
          {hasMore && (
            <div ref={loadingRef} className="flex justify-center items-center gap-2 mt-8">
              <LoadingSpinner size="sm" />
              <span className="text-sm text-secondary">Weitere Transaktionen werden geladen…</span>
            </div>
          )}
        </div>
      </div>

      {/* Neue Transaktion Modal */}
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

      {/* Transaktion bearbeiten Modal */}
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