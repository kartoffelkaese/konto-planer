'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Transaction } from '@/types'
import { getTransactions, updateTransaction, createRecurringInstance, createPendingInstances } from '@/lib/api'
import { isTransactionDueInSalaryMonth, getSalaryMonthRange } from '@/lib/dateUtils'
import TransactionList from '@/components/TransactionList'
import MonthlyOverview from '@/components/MonthlyOverview'
import Modal from '@/components/Modal'
import TransactionForm from '@/components/TransactionForm'
import EditTransactionForm from '@/components/EditTransactionForm'

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [salaryDay, setSalaryDay] = useState<number | null>(null)
  const [accountName, setAccountName] = useState('Mein Konto')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
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

  // Modal states
  const [showNewTransactionModal, setShowNewTransactionModal] = useState(false)
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
    if (salaryDay === null) return
    loadTotals()
  }, [salaryDay])

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
      const response = await getTransactions(pageNum)
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
  }, [hasMore, loading, page])

  // Leere Funktion für die Kompatibilität mit TransactionList
  const lastElementRef = useCallback(() => {}, [])

  const handleToggleConfirmation = async (transaction: Transaction) => {
    try {
      const updatedTransaction = await updateTransaction(transaction.id, {
        isConfirmed: !transaction.isConfirmed,
        lastConfirmedDate: !transaction.isConfirmed ? new Date().toISOString() : null
      })
      setTransactions(transactions.map(t => 
        t.id === updatedTransaction.id ? {
          ...updatedTransaction,
          amount: Number(updatedTransaction.amount)
        } : t
      ))
    } catch (err) {
      console.error('Fehler beim Aktualisieren der Transaktion:', err)
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
  }, [page, salaryDay])

  const handleCreatePending = async () => {
    try {
      await createPendingInstances()
      await handleTransactionChange()
    } catch (err) {
      console.error('Error creating pending instances:', err)
      setError('Fehler beim Erstellen der ausstehenden Zahlungen')
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

  if (loading && transactions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8 flex flex-col items-center justify-center">
        <div className="flex items-center space-x-3">
          <svg className="animate-spin h-5 w-5 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-gray-600 dark:text-gray-400">Transaktionen werden geladen...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8 flex flex-col items-center justify-center">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-6 py-4 rounded-lg flex items-center space-x-3">
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      </div>
    )
  }

  return (
    <div id="transaction-page" className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div id="transaction-container" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div id="error-message" className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg">
            {error}
          </div>
        )}

        <div id="page-header" className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{accountName}</h1>
              <button
                onClick={handleCreatePending}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/20 hover:bg-blue-200 dark:hover:bg-blue-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                Ausstehende Zahlungen erstellen
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Verwalten Sie Ihre Ein- und Ausgaben
            </p>
          </div>
          <button
            onClick={() => setShowNewTransactionModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          >
            Neue Transaktion
          </button>
        </div>

        <div id="monthly-overview-section" className="rounded-lg shadow-md p-4 mb-8 bg-white dark:bg-gray-800">
          <MonthlyOverview 
            currentIncome={totals.currentIncome}
            currentExpenses={totals.currentExpenses}
            totalIncome={totals.totalIncome}
            totalExpenses={totals.totalExpenses}
            totalPendingExpenses={totals.totalPendingExpenses}
            available={totals.available}
          />
        </div>

        <div id="transaction-list-section" className="rounded-lg shadow-md p-4 mb-8 bg-white dark:bg-gray-800">
          <TransactionList 
            transactions={transactions} 
            onTransactionChange={handleTransactionChange}
            lastElementRef={lastElementRef}
          />
          {hasMore && (
            <div ref={loadingRef} className="flex justify-center mt-8">
              <div className="flex items-center space-x-3">
                <svg className="animate-spin h-5 w-5 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-gray-600 dark:text-gray-400">Weitere Transaktionen werden geladen...</span>
              </div>
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
    </div>
  )
} 