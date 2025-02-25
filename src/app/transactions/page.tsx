'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Transaction } from '@/types'
import { getTransactions, updateTransaction, createRecurringInstance, createPendingInstances } from '@/lib/api'
import { isTransactionDueInSalaryMonth, getSalaryMonthRange } from '@/lib/dateUtils'
import TransactionList from '@/components/TransactionList'
import MonthlyOverview from '@/components/MonthlyOverview'

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [salaryDay, setSalaryDay] = useState(23) // TODO: Aus den Einstellungen laden
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const observer = useRef<IntersectionObserver | null>(null)
  const loadingRef = useRef<HTMLDivElement>(null)

  const loadTransactions = async (pageNum: number, append = false) => {
    try {
      setLoading(true)
      const response = await getTransactions(pageNum)
      const data = response.transactions.map(t => ({
        ...t,
        amount: Number(t.amount)
      }))
      
      setTransactions(prev => append ? [...prev, ...data] : data)
      setHasMore(response.hasMore)
      setError(null)
    } catch (err) {
      setError('Fehler beim Laden der Transaktionen')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const lastElementRef = useCallback((node: HTMLElement | null) => {
    if (loading) return
    
    if (observer.current) observer.current.disconnect()
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1)
      }
    })
    
    if (node) observer.current.observe(node)
  }, [loading, hasMore])

  useEffect(() => {
    loadTransactions(1)
  }, [])

  useEffect(() => {
    if (page > 1) {
      loadTransactions(page, true)
    }
  }, [page])

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

  const handleCreatePending = async () => {
    try {
      await createPendingInstances()
      loadTransactions(1)
    } catch (err) {
      console.error('Fehler beim Erstellen der ausstehenden Transaktionen:', err)
    }
  }

  const calculateTotals = () => {
    const { startDate, endDate } = getSalaryMonthRange(salaryDay)

    const totals = transactions.reduce(
      (acc, transaction) => {
        const transactionDate = new Date(transaction.date)
        const amount = Math.abs(transaction.amount)

        // Für den aktuellen Gehaltsmonat nur Transaktionen im Zeitraum
        if (transactionDate >= startDate && transactionDate <= endDate) {
          if (transaction.amount > 0) {
            acc.currentIncome += transaction.amount
          } else {
            acc.currentExpenses += amount
            
            // Prüfen ob die Transaktion im aktuellen Gehaltsmonat fällig ist
            if (isTransactionDueInSalaryMonth(transaction, salaryDay) && !transaction.isConfirmed) {
              acc.pendingExpenses += amount
            }
          }
        }

        // Für das verfügbare Budget:
        // 1. Alle bestätigten Einnahmen
        if (transaction.isConfirmed && transaction.amount > 0) {
          acc.totalIncome += transaction.amount
        }
        // 2. Alle bestätigten Ausgaben
        if (transaction.isConfirmed && transaction.amount < 0) {
          acc.totalExpenses += amount
        }
        // 3. Alle noch nicht bestätigten Ausgaben
        if (!transaction.isConfirmed && transaction.amount < 0) {
          acc.totalPendingExpenses += amount
        }
        
        return acc
      },
      { 
        currentIncome: 0,
        currentExpenses: 0,
        pendingExpenses: 0,
        totalIncome: 0,
        totalExpenses: 0,
        totalPendingExpenses: 0
      }
    )

    return {
      ...totals,
      // Verfügbar = Einnahmen - (bestätigte Ausgaben + ausstehende Ausgaben)
      available: totals.totalIncome - (totals.totalExpenses + totals.totalPendingExpenses)
    }
  }

  const isTransactionPending = (transaction: Transaction) => {
    return transaction.isRecurring && 
           isTransactionDueInSalaryMonth(transaction, salaryDay) && 
           !transaction.isConfirmed
  }

  if (loading) {
    return <div className="p-8 flex items-center justify-center">Laden...</div>
  }

  if (error) {
    return (
      <div className="p-8 flex items-center justify-center text-red-600">
        {error}
      </div>
    )
  }

  const totals = calculateTotals()

  return (
    <main className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold">Transaktionen</h2>
          <div className="space-x-4">
            <button
              onClick={handleCreatePending}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Ausstehende Zahlungen erstellen
            </button>
            <Link
              href="/transactions/new"
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Neue Transaktion
            </Link>
          </div>
        </div>

        <MonthlyOverview transactions={transactions} />

        {error ? (
          <div className="text-center p-4 text-red-600">{error}</div>
        ) : (
          <>
            <TransactionList 
              transactions={transactions} 
              onTransactionChange={() => loadTransactions(1)}
              lastElementRef={lastElementRef}
            />
            {loading && (
              <div ref={loadingRef} className="text-center p-4">
                Laden...
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
} 