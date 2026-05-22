'use client'

import { useState, useEffect } from 'react'
import {
  getRecurringTransactions,
  createRecurringInstance,
  createPendingInstances,
  setRecurringPaused,
} from '@/lib/api'
import { getNextRecurringDueDate, formatDate } from '@/lib/dateUtils'
import {
  getRecurringSalaryMonthStatus,
  type RecurringWithStatus,
} from '@/lib/recurringStatus'
import { formatCurrency } from '@/lib/formatters'
import {
  PencilIcon,
  ArrowPathIcon,
  PauseIcon,
  PlayIcon,
} from '@heroicons/react/24/outline'
import Modal from '@/components/Modal'
import TransactionForm from '@/components/TransactionForm'
import EditTransactionForm from '@/components/EditTransactionForm'
import PageLoader from '@/components/PageLoader'
import PageError from '@/components/PageError'
import SalaryMonthHint from '@/components/SalaryMonthHint'
import { useToast } from '@/hooks/useToast'
import { useUserSettings } from '@/hooks/useUserSettings'
import { Button } from '@/components/Button'

export default function RecurringTransactionsPage() {
  const { showToast } = useToast()
  const { salaryDay } = useUserSettings()
  const [transactions, setTransactions] = useState<RecurringWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreatingPending, setIsCreatingPending] = useState(false)
  const [showNewTransactionModal, setShowNewTransactionModal] = useState(false)
  const [showEditTransactionModal, setShowEditTransactionModal] = useState(false)
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null)
  const [togglingPauseId, setTogglingPauseId] = useState<string | null>(null)

  useEffect(() => {
    loadTransactions()
  }, [])

  const loadTransactions = async () => {
    try {
      const transactions = await getRecurringTransactions()
      // Konvertiere die Beträge in Zahlen und stelle sicher, dass alle erforderlichen Felder vorhanden sind
      const recurringTransactions = transactions.map((t) => ({
        ...t,
        amount: Number(t.amount),
        version: t.version || 1,
        userId: t.userId || '',
        isRecurringPaused: Boolean(t.isRecurringPaused),
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

  const handleCreateAllPending = async () => {
    setIsCreatingPending(true)
    try {
      await createPendingInstances()
      await loadTransactions()
      showToast('Ausstehende Zahlungen erstellt', 'success')
    } catch (err) {
      console.error('Fehler beim Erstellen der ausstehenden Transaktionen:', err)
      showToast('Fehler beim Erstellen der ausstehenden Zahlungen', 'error')
    } finally {
      setIsCreatingPending(false)
    }
  }

  const handleTogglePause = async (transaction: RecurringWithStatus) => {
    const willPause = !transaction.isRecurringPaused
    setTogglingPauseId(transaction.id)
    try {
      await setRecurringPaused(transaction.id, willPause)
      showToast(
        willPause ? 'Zahlung pausiert' : 'Zahlung fortgesetzt',
        'success'
      )
      await loadTransactions()
    } catch (err) {
      console.error('Fehler beim Pausieren:', err)
      showToast('Status konnte nicht geändert werden', 'error')
    } finally {
      setTogglingPauseId(null)
    }
  }

  const handleCreateNextInstance = async (transaction: RecurringWithStatus) => {
    if (transaction.isRecurringPaused) {
      showToast('Zahlung ist pausiert', 'error')
      return
    }
    try {
      const newTransaction = await createRecurringInstance(transaction.id)
      showToast(`Neue Zahlung für „${transaction.merchant}“ erstellt`, 'success')
      window.location.href = '/transactions'
    } catch (err) {
      console.error('Fehler beim Erstellen der nächsten Instanz:', err)
      setError('Fehler beim Erstellen der nächsten Zahlung')
      showToast('Fehler beim Erstellen der nächsten Zahlung', 'error')
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

  const getNextPaymentDate = (transaction: RecurringWithStatus): Date => {
    return getNextRecurringDueDate(
      transaction.date,
      transaction.recurringInterval || 'monthly'
    )
  }

  const hasDueWithoutInstance = transactions.some(
    (t) =>
      !t.isRecurringPaused &&
      t.dueInSalaryMonth &&
      !t.hasInstanceInSalaryMonth
  )

  if (loading) {
    return <PageLoader message="Wiederkehrende Zahlungen werden geladen…" />
  }

  if (error) {
    return (
      <PageError
        message={error}
        onRetry={() => {
          setError(null)
          setLoading(true)
          loadTransactions()
        }}
      />
    )
  }

  // Sortiere die Transaktionen nach dem nächsten Zahlungsdatum
  const sortedTransactions = [...transactions].sort((a, b) => {
    if (a.isRecurringPaused !== b.isRecurringPaused) {
      return a.isRecurringPaused ? 1 : -1
    }
    const dateA = a.isRecurringPaused
      ? new Date(a.date).getTime()
      : getNextPaymentDate(a).getTime()
    const dateB = b.isRecurringPaused
      ? new Date(b.date).getTime()
      : getNextPaymentDate(b).getTime()
    return dateA - dateB
  })

  const activeForTotals = sortedTransactions.filter((t) => !t.isRecurringPaused)

  const totals = {
    monthly: {
      total: activeForTotals
        .filter(t => t.recurringInterval === 'monthly')
        .reduce((acc, t) => acc + t.amount, 0),
      perMonth: activeForTotals
        .filter(t => t.recurringInterval === 'monthly')
        .reduce((acc, t) => acc + t.amount, 0)
    },
    quarterly: {
      total: activeForTotals
        .filter(t => t.recurringInterval === 'quarterly')
        .reduce((acc, t) => acc + t.amount, 0),
      perMonth: activeForTotals
        .filter(t => t.recurringInterval === 'quarterly')
        .reduce((acc, t) => acc + t.amount / 3, 0)
    },
    yearly: {
      total: activeForTotals
        .filter(t => t.recurringInterval === 'yearly')
        .reduce((acc, t) => acc + t.amount, 0),
      perMonth: activeForTotals
        .filter(t => t.recurringInterval === 'yearly')
        .reduce((acc, t) => acc + t.amount / 12, 0)
    }
  }

  const totalMonthly = totals.monthly.perMonth + totals.quarterly.perMonth + totals.yearly.perMonth

  return (
    <div id="recurring-page" className="min-h-screen">
      <div id="recurring-container" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div id="page-header" className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 mb-8">
          <div>
            <h1 className="page-title">Wiederkehrende Zahlungen</h1>
            <p className="mt-1 text-sm text-secondary">
              Verwalten Sie Ihre regelmäßigen Ein- und Ausgaben
            </p>
            {salaryDay !== null && (
              <div className="mt-2 space-y-1">
                <SalaryMonthHint salaryDay={salaryDay} />
                <p className="text-xs text-secondary">
                  Nächste Zahlung basiert auf dem Fälligkeitstag der Anlage, nicht auf dem
                  Bestätigungsdatum.
                </p>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {hasDueWithoutInstance && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleCreateAllPending}
                loading={isCreatingPending}
                loadingText="Wird erstellt…"
              >
                Ausstehende erstellen
              </Button>
            )}
          <button
            onClick={() => setShowNewTransactionModal(true)}
            className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent focus:ring-offset-canvas transition-colors duration-150"
          >
            <svg className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Neue wiederkehrende Zahlung
          </button>
          </div>
        </div>

        <div id="monthly-summary" className="rounded-lg border border-border p-4 mb-8 bg-surface">
          <h3 className="text-sm font-semibold mb-3 text-primary">Monatliche Belastung</h3>
          <div id="summary-grid" className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div id="monthly-total" className="p-2 bg-income-bg rounded-lg border-l-4 border-l-income">
              <p className="text-xs text-income mb-1">Monatlich</p>
              <p className="text-lg font-semibold text-income">
                {formatCurrency(Math.abs(totals.monthly.total))}
              </p>
            </div>
            <div id="quarterly-total" className="p-2 bg-pending-bg rounded-lg border-l-4 border-l-pending">
              <p className="text-xs text-pending mb-1">Vierteljährlich</p>
              <p className="text-lg font-semibold tabular-nums text-pending">
                {formatCurrency(Math.abs(totals.quarterly.total))}
                <span className="text-xs ml-1">
                  ({formatCurrency(Math.abs(totals.quarterly.perMonth))}/M)
                </span>
              </p>
            </div>
            <div id="yearly-total" className="p-2 bg-accent-subtle rounded-lg border-l-4 border-l-accent">
              <p className="text-xs text-accent mb-1">Jährlich</p>
              <p className="text-lg font-semibold tabular-nums text-accent">
                {formatCurrency(Math.abs(totals.yearly.total))}
                <span className="text-xs ml-1">
                  ({formatCurrency(Math.abs(totals.yearly.perMonth))}/M)
                </span>
              </p>
            </div>
            <div id="total-monthly" className="p-2 bg-surface-muted rounded-lg border-l-4 border-l-border">
              <p className="text-xs text-secondary mb-1">Gesamt pro Monat</p>
              <p className="text-lg font-semibold tabular-nums text-primary">
                {formatCurrency(Math.abs(totalMonthly))}
              </p>
            </div>
          </div>
        </div>

        <div id="transactions-table" className="rounded-lg border border-border p-4 mb-8 bg-surface">
          <div className="overflow-x-auto">
            {/* Desktop-Ansicht */}
            <table className="min-w-full hidden md:table">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-secondary">Händler</th>
                  <th className="text-left p-4 text-secondary">Beschreibung</th>
                  <th className="text-right p-4 text-secondary">Betrag</th>
                  <th className="text-center p-4 text-secondary">Intervall</th>
                  <th className="text-center p-4 text-secondary">Status</th>
                  <th className="text-center p-4 text-secondary">Letzte Bestätigung</th>
                  <th className="text-center p-4 text-secondary">Nächste Zahlung</th>
                  <th className="text-center p-4 text-secondary">Gehaltsmonat</th>
                  <th className="text-right p-4 text-secondary">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center p-4 text-sm text-secondary">
                      Keine wiederkehrenden Zahlungen vorhanden
                    </td>
                  </tr>
                ) : (
                  sortedTransactions.map((transaction) => {
                    const salaryStatus = getRecurringSalaryMonthStatus(transaction)
                    return (
                    <tr key={transaction.id} className="border-b border-border last:border-b-0">
                      <td className="p-4 text-sm text-primary">{transaction.merchant}</td>
                      <td className="p-4 text-sm text-primary">{transaction.description}</td>
                      <td className={`p-4 text-sm text-right ${
                        transaction.amount > 0 ? 'text-income' : 'text-expense'
                      }`}>
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="p-4 text-sm text-center text-primary">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          transaction.recurringInterval === 'monthly' 
                            ? 'bg-income-bg text-income' 
                            : transaction.recurringInterval === 'quarterly'
                            ? 'bg-pending-bg text-pending'
                            : 'bg-accent-subtle text-accent'
                        }`}>
                          {transaction.recurringInterval === 'monthly' && 'Monatlich'}
                          {transaction.recurringInterval === 'quarterly' && 'Vierteljährlich'}
                          {transaction.recurringInterval === 'yearly' && 'Jährlich'}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            transaction.isRecurringPaused
                              ? 'bg-surface-muted text-secondary'
                              : 'bg-income-bg text-income'
                          }`}
                        >
                          {transaction.isRecurringPaused ? 'Pausiert' : 'Aktiv'}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-center text-primary">
                        {transaction.lastConfirmedDate
                          ? formatDate(new Date(transaction.lastConfirmedDate))
                          : '-'}
                      </td>
                      <td className="p-4 text-sm text-center text-primary">
                        {transaction.isRecurringPaused
                          ? '—'
                          : formatDate(getNextPaymentDate(transaction))}
                      </td>
                      <td className="p-4 text-sm text-center">
                        <span
                          className={`inline-flex max-w-[12rem] items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${salaryStatus.className}`}
                          title={salaryStatus.label}
                        >
                          {salaryStatus.label}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => handleTogglePause(transaction)}
                            disabled={togglingPauseId === transaction.id}
                            title={
                              transaction.isRecurringPaused
                                ? 'Fortsetzen'
                                : 'Pausieren'
                            }
                            className="text-accent hover:text-accent-hover disabled:opacity-50"
                          >
                            {transaction.isRecurringPaused ? (
                              <PlayIcon className="h-5 w-5" />
                            ) : (
                              <PauseIcon className="h-5 w-5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCreateNextInstance(transaction)}
                            disabled={transaction.isRecurringPaused}
                            title={
                              transaction.isRecurringPaused
                                ? 'Zahlung ist pausiert'
                                : 'Nächste Zahlung erstellen'
                            }
                            className="text-accent hover:text-accent-hover disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <ArrowPathIcon className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTransactionId(transaction.id)
                              setShowEditTransactionModal(true)
                            }}
                            title="Zahlung bearbeiten"
                            className="text-accent hover:text-accent-hover"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )})
                )}
              </tbody>
            </table>

            {/* Mobile-Ansicht */}
            <div className="md:hidden space-y-4">
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-sm text-secondary">
                  Keine wiederkehrenden Zahlungen vorhanden
                </div>
              ) : (
                sortedTransactions.map((transaction) => {
                  const salaryStatus = getRecurringSalaryMonthStatus(transaction)
                  return (
                  <div key={transaction.id} className="rounded-lg shadow-sm border border-border p-4 bg-surface">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="p-1.5 bg-accent-subtle rounded-lg">
                          <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-primary">{transaction.description}</h3>
                        <p className="text-xs text-secondary">{transaction.merchant}</p>
                      </div>
                    </div>
                    <p
                      className={`mt-2 text-sm font-medium ${
                        transaction.amount > 0 ? 'text-income' : 'text-expense'
                      }`}
                    >
                      {formatCurrency(transaction.amount)}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          transaction.isRecurringPaused
                            ? 'bg-surface-muted text-secondary'
                            : 'bg-income-bg text-income'
                        }`}
                      >
                        {transaction.isRecurringPaused ? 'Pausiert' : 'Aktiv'}
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${salaryStatus.className}`}
                      >
                        {salaryStatus.label}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        transaction.recurringInterval === 'monthly' 
                          ? 'bg-income-bg text-income' 
                          : transaction.recurringInterval === 'quarterly'
                          ? 'bg-pending-bg text-pending'
                          : 'bg-accent-subtle text-accent'
                      }`}>
                        {transaction.recurringInterval === 'monthly' && 'Monatlich'}
                        {transaction.recurringInterval === 'quarterly' && 'Vierteljährlich'}
                        {transaction.recurringInterval === 'yearly' && 'Jährlich'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm text-secondary mb-3">
                      <div>
                        <div className="text-xs text-secondary">Letzte Bestätigung</div>
                        <div>{transaction.lastConfirmedDate
                          ? formatDate(new Date(transaction.lastConfirmedDate))
                          : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-secondary">Nächste Zahlung</div>
                        <div>
                          {transaction.isRecurringPaused
                            ? '—'
                            : formatDate(getNextPaymentDate(transaction))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleTogglePause(transaction)}
                        disabled={togglingPauseId === transaction.id}
                        className="inline-flex items-center px-3 py-1.5 text-xs rounded-control border border-border text-primary hover:bg-surface-muted transition-colors duration-feedback disabled:opacity-50"
                      >
                        {transaction.isRecurringPaused ? (
                          <>
                            <PlayIcon className="h-4 w-4 mr-1" />
                            Fortsetzen
                          </>
                        ) : (
                          <>
                            <PauseIcon className="h-4 w-4 mr-1" />
                            Pausieren
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCreateNextInstance(transaction)}
                        disabled={transaction.isRecurringPaused}
                        className="inline-flex items-center px-3 py-1.5 text-xs rounded-control border border-accent text-accent hover:bg-accent-subtle transition-colors duration-feedback disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ArrowPathIcon className="h-4 w-4 mr-1" />
                        Neue Instanz
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTransactionId(transaction.id)
                          setShowEditTransactionModal(true)
                        }}
                        className="inline-flex items-center px-3 py-1.5 text-xs rounded-control border border-accent text-accent hover:bg-accent-subtle transition-colors duration-feedback"
                      >
                        <PencilIcon className="h-4 w-4 mr-1" />
                        Bearbeiten
                      </button>
                    </div>
                  </div>
                )})
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