'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Transaction } from '@/types/index'
import { getRecurringTransactions, createRecurringInstance, createPendingInstances } from '@/lib/api'
import { isTransactionDueInSalaryMonth, getNextDueDate, formatDate } from '@/lib/dateUtils'
import { formatCurrency, formatNumber } from '@/lib/formatters'
import { PencilIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
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
      // Konvertiere die Beträge in Zahlen
      const recurringTransactions = transactions.map(t => ({
        ...t,
        amount: Number(t.amount),
        version: t.version || 1
      }))
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
    if (!transaction.lastConfirmedDate || !transaction.recurringInterval) {
      // Wenn keine letzte Bestätigung oder kein Intervall, dann das Transaktionsdatum verwenden
      return new Date(transaction.date)
    }
    return getNextDueDate(new Date(transaction.lastConfirmedDate), transaction.recurringInterval)
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {successMessage && (
          <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-lg shadow-md transition-opacity">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 mb-8">
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

        <div className="bg-white rounded-lg shadow-md p-4 mb-8">
          <h3 className="text-sm font-semibold mb-3">Monatliche Belastung</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-800 mb-1">Monatlich</p>
              <p className="text-lg font-semibold text-blue-600">
                {formatCurrency(Math.abs(totals.monthly.total))}
              </p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-800 mb-1">Vierteljährlich</p>
              <p className="text-lg font-semibold text-blue-600">
                {formatCurrency(Math.abs(totals.quarterly.total))}
                <span className="text-xs ml-1">
                  ({formatCurrency(Math.abs(totals.quarterly.perMonth))}/M)
                </span>
              </p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-800 mb-1">Jährlich</p>
              <p className="text-lg font-semibold text-blue-600">
                {formatCurrency(Math.abs(totals.yearly.total))}
                <span className="text-xs ml-1">
                  ({formatCurrency(Math.abs(totals.yearly.perMonth))}/M)
                </span>
              </p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <p className="text-xs text-blue-800 mb-1">Gesamt pro Monat</p>
              <p className="text-lg font-semibold text-blue-600">
                {formatCurrency(Math.abs(totalMonthly))}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full">
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
                    <td colSpan={7} className="text-center p-4 text-gray-500">
                      Keine wiederkehrenden Zahlungen vorhanden
                    </td>
                  </tr>
                ) : (
                  sortedTransactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b last:border-b-0">
                      <td className="p-4">{transaction.merchant}</td>
                      <td className="p-4">{transaction.description}</td>
                      <td className={`p-4 text-right ${
                        transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="p-4 text-center">
                        {transaction.recurringInterval === 'monthly' && 'Monatlich'}
                        {transaction.recurringInterval === 'quarterly' && 'Vierteljährlich'}
                        {transaction.recurringInterval === 'yearly' && 'Jährlich'}
                      </td>
                      <td className="p-4 text-center">
                        {transaction.lastConfirmedDate
                          ? formatDate(new Date(transaction.lastConfirmedDate))
                          : '-'}
                      </td>
                      <td className="p-4 text-center">
                        {formatDate(getNextPaymentDate(transaction))}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedTransactionId(transaction.id)
                            setShowEditTransactionModal(true)
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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