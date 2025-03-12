'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Transaction } from '@/types/index'
import { getRecurringTransactions, createRecurringInstance, createPendingInstances } from '@/lib/api'
import { isTransactionDueInSalaryMonth, getNextDueDate, formatDate } from '@/lib/dateUtils'
import { formatCurrency, formatNumber } from '@/lib/formatters'
import { PencilIcon, ArrowPathIcon, TrashIcon } from '@heroicons/react/24/outline'
import Modal from '@/components/Modal'
import TransactionForm from '@/components/TransactionForm'
import EditTransactionForm from '@/components/EditTransactionForm'

export default function RecurringTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [salaryDay, setSalaryDay] = useState(23) // TODO: Aus den Einstellungen laden
  const [showNewTransactionModal, setShowNewTransactionModal] = useState(false)
  const [showEditTransactionModal, setShowEditTransactionModal] = useState(false)
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null)

  useEffect(() => {
    loadTransactions()
  }, [])

  const loadTransactions = async () => {
    try {
      const transactions = await getRecurringTransactions()
      // Konvertiere die Beträge in Zahlen und stelle sicher, dass alle erforderlichen Felder vorhanden sind
      const recurringTransactions = transactions.map(t => ({
        ...t,
        amount: Number(t.amount),
        version: t.version || 1,
        userId: t.userId || '', // Stelle sicher, dass userId immer einen Wert hat
      })) as Transaction[]
      setTransactions(recurringTransactions)
      setError(null)
    } catch (err) {
      setError('Fehler beim Laden der Transaktionen')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNextInstance = async (transaction: Transaction) => {
    try {
      const newTransaction = await createRecurringInstance(transaction.id)
      setSuccessMessage(`Neue Zahlung für "${transaction.merchant}" wurde erstellt`)
      // Nach 3 Sekunden ausblenden
      setTimeout(() => setSuccessMessage(null), 3000)
      // Zur Transaktionsseite weiterleiten
      window.location.href = '/transactions'
    } catch (err) {
      console.error('Fehler beim Erstellen der nächsten Instanz:', err)
      setError('Fehler beim Erstellen der nächsten Zahlung')
      setTimeout(() => setError(null), 3000)
    }
  }

  const handleCreateAllPending = async () => {
    try {
      await createPendingInstances()
      // Nach dem Erstellen neu laden
      await loadTransactions()
    } catch (err) {
      console.error('Fehler beim Erstellen der ausstehenden Transaktionen:', err)
    }
  }

  const handleEditSuccess = () => {
    setShowEditTransactionModal(false)
    setSelectedTransactionId(null)
    loadTransactions()
  }

  const handleNewTransactionSuccess = () => {
    setShowNewTransactionModal(false)
    loadTransactions()
  }

  const getIntervalText = (interval: string) => {
    switch (interval) {
      case 'monthly':
        return 'Monatlich'
      case 'quarterly':
        return 'Vierteljährlich'
      case 'yearly':
        return 'Jährlich'
      default:
        return interval
    }
  }

  const getNextPaymentDate = (transaction: Transaction): Date => {
    if (!transaction.lastConfirmedDate) {
      // Wenn keine letzte Bestätigung vorhanden ist, das ursprüngliche Datum verwenden
      return new Date(transaction.date)
    }

    // Berechne das nächste Fälligkeitsdatum basierend auf der letzten Bestätigung
    const nextDate = getNextDueDate(
      new Date(transaction.lastConfirmedDate),
      transaction.recurringInterval || 'monthly'
    )

    // Wenn das nächste Datum in der Vergangenheit liegt, berechne das nächste gültige Datum
    const today = new Date()
    while (nextDate < today) {
      const newDate = getNextDueDate(nextDate, transaction.recurringInterval || 'monthly')
      nextDate.setTime(newDate.getTime())
    }

    return nextDate
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

  // Sortiere die Transaktionen nach dem nächsten Zahlungsdatum
  const sortedTransactions = [...transactions].sort((a, b) => {
    const dateA = getNextPaymentDate(a)
    const dateB = getNextPaymentDate(b)
    return dateA.getTime() - dateB.getTime()
  })

  const totals = {
    monthly: {
      total: sortedTransactions
        .filter(t => t.recurringInterval === 'monthly')
        .reduce((acc, t) => acc + t.amount, 0),
      perMonth: sortedTransactions
        .filter(t => t.recurringInterval === 'monthly')
        .reduce((acc, t) => acc + t.amount, 0)
    },
    quarterly: {
      total: sortedTransactions
        .filter(t => t.recurringInterval === 'quarterly')
        .reduce((acc, t) => acc + t.amount, 0),
      perMonth: sortedTransactions
        .filter(t => t.recurringInterval === 'quarterly')
        .reduce((acc, t) => acc + t.amount / 3, 0)
    },
    yearly: {
      total: sortedTransactions
        .filter(t => t.recurringInterval === 'yearly')
        .reduce((acc, t) => acc + t.amount, 0),
      perMonth: sortedTransactions
        .filter(t => t.recurringInterval === 'yearly')
        .reduce((acc, t) => acc + t.amount / 12, 0)
    }
  }

  const totalMonthly = totals.monthly.perMonth + totals.quarterly.perMonth + totals.yearly.perMonth

  return (
    <div id="recurring-page" className="min-h-screen bg-gray-50">
      <div id="recurring-container" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {successMessage && (
          <div id="success-message" className="mb-4 p-4 bg-green-100 text-green-700 rounded-lg shadow-md transition-opacity">
            {successMessage}
          </div>
        )}

        {error && (
          <div id="error-message" className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div id="page-header" className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Wiederkehrende Zahlungen</h1>
            <p className="mt-1 text-sm text-gray-500">
              Verwalten Sie Ihre regelmäßigen Ein- und Ausgaben
            </p>
          </div>
          <button
            onClick={() => setShowNewTransactionModal(true)}
            className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
          >
            <svg className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Neue wiederkehrende Zahlung
          </button>
        </div>

        <div id="monthly-summary" className="rounded-lg shadow-md p-4 mb-8 bg-white">
          <h3 className="text-sm font-semibold mb-3">Monatliche Belastung</h3>
          <div id="summary-grid" className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div id="monthly-total" className="p-2 bg-green-50 rounded-lg">
              <p className="text-xs text-green-800 mb-1">Monatlich</p>
              <p className="text-lg font-semibold text-green-600">
                {formatCurrency(Math.abs(totals.monthly.total))}
              </p>
            </div>
            <div id="quarterly-total" className="p-2 bg-yellow-50 rounded-lg">
              <p className="text-xs text-yellow-800 mb-1">Vierteljährlich</p>
              <p className="text-lg font-semibold text-yellow-600">
                {formatCurrency(Math.abs(totals.quarterly.total))}
                <span className="text-xs ml-1">
                  ({formatCurrency(Math.abs(totals.quarterly.perMonth))}/M)
                </span>
              </p>
            </div>
            <div id="yearly-total" className="p-2 bg-indigo-50 rounded-lg">
              <p className="text-xs text-indigo-800 mb-1">Jährlich</p>
              <p className="text-lg font-semibold text-indigo-600">
                {formatCurrency(Math.abs(totals.yearly.total))}
                <span className="text-xs ml-1">
                  ({formatCurrency(Math.abs(totals.yearly.perMonth))}/M)
                </span>
              </p>
            </div>
            <div id="total-monthly" className="p-2 bg-purple-50 rounded-lg">
              <p className="text-xs text-purple-800 mb-1">Gesamt pro Monat</p>
              <p className="text-lg font-semibold text-purple-600">
                {formatCurrency(Math.abs(totalMonthly))}
              </p>
            </div>
          </div>
        </div>

        <div id="transactions-table" className="rounded-lg shadow-md p-4 mb-8 bg-white">
          <div className="overflow-x-auto">
            {/* Desktop-Ansicht */}
            <table className="min-w-full hidden md:table">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">Händler</th>
                  <th className="text-left p-4">Beschreibung</th>
                  <th className="text-right p-4">Betrag</th>
                  <th className="text-center p-4">Intervall</th>
                  <th className="text-center p-4">Letzte Bestätigung</th>
                  <th className="text-center p-4">Nächste Zahlung</th>
                  <th className="text-right p-4">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center p-4 text-sm text-gray-500">
                      Keine wiederkehrenden Zahlungen vorhanden
                    </td>
                  </tr>
                ) : (
                  sortedTransactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b last:border-b-0">
                      <td className="p-4 text-sm text-gray-900">{transaction.merchant}</td>
                      <td className="p-4 text-sm text-gray-900">{transaction.description}</td>
                      <td className={`p-4 text-sm text-right ${
                        transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="p-4 text-sm text-center text-gray-900">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          transaction.recurringInterval === 'monthly' 
                            ? 'bg-green-100 text-green-800' 
                            : transaction.recurringInterval === 'quarterly'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {transaction.recurringInterval === 'monthly' && 'Monatlich'}
                          {transaction.recurringInterval === 'quarterly' && 'Vierteljährlich'}
                          {transaction.recurringInterval === 'yearly' && 'Jährlich'}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-center text-gray-900">
                        {transaction.lastConfirmedDate
                          ? formatDate(new Date(transaction.lastConfirmedDate))
                          : '-'}
                      </td>
                      <td className="p-4 text-sm text-center text-gray-900">
                        {formatDate(getNextPaymentDate(transaction))}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleCreateNextInstance(transaction)}
                            title="Nächste Zahlung erstellen"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <ArrowPathIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTransactionId(transaction.id)
                              setShowEditTransactionModal(true)
                            }}
                            title="Zahlung bearbeiten"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Mobile-Ansicht */}
            <div className="md:hidden space-y-4">
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500">
                  Keine wiederkehrenden Zahlungen vorhanden
                </div>
              ) : (
                sortedTransactions.map((transaction) => (
                  <div key={transaction.id} className="rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="p-1.5 bg-indigo-200 rounded-lg">
                          <svg className="w-4 h-4 text-indigo-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">{transaction.description}</h3>
                        <p className="text-xs text-gray-500">{transaction.merchant}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className={`text-sm font-medium ${
                          transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(transaction.amount)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedTransactionId(transaction.id)
                            setShowEditTransactionModal(true)
                          }}
                          className="p-1 text-indigo-600 hover:text-indigo-900"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        transaction.recurringInterval === 'monthly' 
                          ? 'bg-green-100 text-green-800' 
                          : transaction.recurringInterval === 'quarterly'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}>
                        {transaction.recurringInterval === 'monthly' && 'Monatlich'}
                        {transaction.recurringInterval === 'quarterly' && 'Vierteljährlich'}
                        {transaction.recurringInterval === 'yearly' && 'Jährlich'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                      <div>
                        <div className="text-xs text-gray-500">Letzte Bestätigung</div>
                        <div>{transaction.lastConfirmedDate
                          ? formatDate(new Date(transaction.lastConfirmedDate))
                          : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Nächste Zahlung</div>
                        <div>{formatDate(getNextPaymentDate(transaction))}</div>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleCreateNextInstance(transaction)}
                        className="inline-flex items-center px-3 py-1.5 text-xs rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors duration-150"
                      >
                        <ArrowPathIcon className="h-4 w-4 mr-1" />
                        Neue Instanz
                      </button>
                      <button
                        onClick={() => {
                          setSelectedTransactionId(transaction.id)
                          setShowEditTransactionModal(true)
                        }}
                        className="inline-flex items-center px-3 py-1.5 text-xs rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors duration-150"
                      >
                        <PencilIcon className="h-4 w-4 mr-1" />
                        Bearbeiten
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Neue Transaktion Modal */}
      <Modal
        isOpen={showNewTransactionModal}
        onClose={() => setShowNewTransactionModal(false)}
        title="Neue wiederkehrende Zahlung"
        maxWidth="md"
      >
        <TransactionForm
          onSuccess={handleNewTransactionSuccess}
          onCancel={() => setShowNewTransactionModal(false)}
          defaultIsRecurring={true}
        />
      </Modal>

      {/* Bearbeiten Modal */}
      <Modal
        isOpen={showEditTransactionModal}
        onClose={() => setShowEditTransactionModal(false)}
        title="Wiederkehrende Zahlung bearbeiten"
        maxWidth="md"
      >
        {selectedTransactionId && (
          <EditTransactionForm
            id={selectedTransactionId}
            onSuccess={handleEditSuccess}
            onCancel={() => setShowEditTransactionModal(false)}
          />
        )}
      </Modal>
    </div>
  )
} 