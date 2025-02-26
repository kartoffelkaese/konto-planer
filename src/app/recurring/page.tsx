'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Transaction } from '@/types/index'
import { getTransactions, createRecurringInstance, createPendingInstances } from '@/lib/api'
import { isTransactionDueInSalaryMonth, getNextDueDate, formatDate } from '@/lib/dateUtils'
import { PencilIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

export default function RecurringTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [salaryDay, setSalaryDay] = useState(23) // TODO: Aus den Einstellungen laden

  useEffect(() => {
    loadTransactions()
  }, [])

  const loadTransactions = async () => {
    try {
      const response = await getTransactions()
      // Nur wiederkehrende Transaktionen filtern
      const recurringTransactions = response.transactions
        .filter(t => t.isRecurring)
        .map(t => ({
          ...t,
          amount: Number(t.amount)
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
      await createRecurringInstance(transaction.id)
      // Nach dem Erstellen neu laden
      await loadTransactions()
      setSuccessMessage(`Neue Zahlung für "${transaction.merchant}" wurde erstellt`)
      // Nach 3 Sekunden ausblenden
      setTimeout(() => setSuccessMessage(null), 3000)
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
    <main className="p-8">
      <div className="max-w-6xl mx-auto">
        {successMessage && (
          <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-lg shadow-md transition-opacity">
            {successMessage}
          </div>
        )}
        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg shadow-md transition-opacity">
            {error}
          </div>
        )}
        
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold">Wiederkehrende Zahlungen</h2>
          <div className="space-x-4">
            <Link
              href="/transactions/new"
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Neue wiederkehrende Zahlung
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 mb-8">
          <h3 className="text-sm font-semibold mb-3">Monatliche Belastung</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-800 mb-1">Monatlich</p>
              <p className="text-lg font-semibold text-blue-600">
                {Math.abs(totals.monthly.total).toFixed(2)} €
              </p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-800 mb-1">Vierteljährlich</p>
              <p className="text-lg font-semibold text-blue-600">
                {Math.abs(totals.quarterly.total).toFixed(2)} €
                <span className="text-xs ml-1">
                  ({Math.abs(totals.quarterly.perMonth).toFixed(2)} €/M)
                </span>
              </p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-800 mb-1">Jährlich</p>
              <p className="text-lg font-semibold text-blue-600">
                {Math.abs(totals.yearly.total).toFixed(2)} €
                <span className="text-xs ml-1">
                  ({Math.abs(totals.yearly.perMonth).toFixed(2)} €/M)
                </span>
              </p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <p className="text-xs text-blue-800 mb-1">Gesamt pro Monat</p>
              <p className="text-lg font-semibold text-blue-600">
                {Math.abs(totalMonthly).toFixed(2)} €
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
                    <tr key={transaction.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        {transaction.merchant}
                      </td>
                      <td className="p-4">
                        {transaction.description || "-"}
                      </td>
                      <td className={`p-4 text-right ${
                        transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.amount.toFixed(2)} €
                      </td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {getIntervalText(transaction.recurringInterval || '')}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {transaction.lastConfirmedDate 
                          ? formatDate(transaction.lastConfirmedDate)
                          : 'Nie'}
                      </td>
                      <td className="p-4 text-center">
                        {transaction.lastConfirmedDate && transaction.recurringInterval
                          ? formatDate(
                              getNextDueDate(
                                new Date(transaction.lastConfirmedDate),
                                transaction.recurringInterval
                              )
                            )
                          : 'Sofort fällig'}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/transactions/${transaction.id}/edit`}
                            className="inline-flex items-center px-2 py-1 text-sm rounded border border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <PencilIcon className="h-4 w-4 mr-1" />
                          </Link>
                          <button
                            onClick={() => handleCreateNextInstance(transaction)}
                            className="inline-flex items-center px-2 py-1 text-sm rounded border border-green-600 text-green-600 hover:bg-green-50 transition-colors"
                          >
                            <ArrowPathIcon className="h-4 w-4 mr-1" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  )
} 