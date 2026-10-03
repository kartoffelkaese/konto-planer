'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  getRecurringTransactions,
  createRecurringInstance,
  createPendingInstances,
  setRecurringPaused,
} from '@/lib/api'
import { getNextRecurringDueDate, formatDate } from '@/lib/dateUtils'
import { computeRecurringTotals } from '@/lib/recurringTotals'
import {
  getRecurringIntervalBadgeClassName,
  getRecurringIntervalLabel,
} from '@/lib/recurringIntervals'
import {
  getRecurringSalaryMonthStatus,
  hasDueRecurringWithoutInstance,
  type RecurringWithStatus,
} from '@/lib/recurringStatus'
import { formatCurrency } from '@/lib/formatters'
import {
  PencilIcon,
  ArrowPathIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'
import Modal from '@/components/Modal'
import TransactionForm from '@/components/TransactionForm'
import EditTransactionForm from '@/components/EditTransactionForm'
import PageLoader from '@/components/PageLoader'
import PageError from '@/components/PageError'
import SalaryMonthHint from '@/components/SalaryMonthHint'
import RecurringAnchorHint from '@/components/RecurringAnchorHint'
import RecurringMobileCard from '@/components/recurring/RecurringMobileCard'
import { useToast } from '@/hooks/useToast'
import { useUserSettings } from '@/hooks/useUserSettings'
import { useActiveAccountReload } from '@/hooks/useActiveAccountReload'
import PageContextHeader from '@/components/PageContextHeader'
import { resolveTransactionMerchantName } from '@/lib/merchantCategories'
import { Button } from '@/components/Button'
import PendingUndoButton from '@/components/PendingUndoButton'
import { usePendingUndo } from '@/contexts/PendingUndoContext'

export default function RecurringTransactionsPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const { registerCreated } = usePendingUndo()
  const { salaryDay, canWrite, isSimpleAccount, loading: settingsLoading, accountName } = useUserSettings()
  const [transactions, setTransactions] = useState<RecurringWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreatingPending, setIsCreatingPending] = useState(false)
  const [showNewTransactionModal, setShowNewTransactionModal] = useState(false)
  const [showEditTransactionModal, setShowEditTransactionModal] = useState(false)
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null)
  const [togglingPauseId, setTogglingPauseId] = useState<string | null>(null)

  useEffect(() => {
    if (!settingsLoading && isSimpleAccount) {
      router.replace('/transactions')
    }
  }, [settingsLoading, isSimpleAccount, router])

  const loadTransactions = useCallback(
    () =>
      getRecurringTransactions()
        .then(
          (transactions) => {
            // Konvertiere die Beträge in Zahlen und stelle sicher, dass alle erforderlichen Felder vorhanden sind
            const recurringTransactions = transactions.map((t) => ({
              ...t,
              amount: Number(t.amount),
              version: t.version || 1,
              accountId: t.accountId || '',
              isRecurringPaused: Boolean(t.isRecurringPaused),
            }))
            setTransactions(recurringTransactions)
            setError(null)
          },
          (err: unknown) => {
            setError('Fehler beim Laden der Transaktionen')
            console.error(err)
          }
        )
        .finally(() => setLoading(false)),
    []
  )

  useEffect(() => {
    if (!isSimpleAccount) {
      void loadTransactions()
    }
  }, [isSimpleAccount, loadTransactions])

  useActiveAccountReload(() => {
    if (!isSimpleAccount) {
      setLoading(true)
      void loadTransactions()
    }
  })

  const handleCreateAllPending = async () => {
    setIsCreatingPending(true)
    try {
      const created = await createPendingInstances()
      await loadTransactions()
      registerCreated(created)
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
      await createRecurringInstance(transaction.id)
      showToast(`Neue Zahlung für „${resolveTransactionMerchantName(transaction)}“ erstellt`, 'success')
      router.push('/transactions')
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

  const hasDueWithoutInstance = hasDueRecurringWithoutInstance(transactions)

  if (settingsLoading || isSimpleAccount) {
    return <PageLoader message="Wird weitergeleitet…" />
  }

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
  const totals = computeRecurringTotals(activeForTotals)
  const totalMonthly = totals.totalMonthly

  return (
    <div id="recurring-page" className="min-h-screen">
      <div id="recurring-container" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageContextHeader
          title="Wiederkehrende Zahlungen"
          subtitle={`${accountName} · Regelmäßige Ein- und Ausgaben`}
          actions={
            <>
              {canWrite && hasDueWithoutInstance && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCreateAllPending}
                  loading={isCreatingPending}
                  loadingText="Wird erstellt…"
                >
                  Ausstehende erstellen
                </Button>
              )}
              {canWrite && <PendingUndoButton onUndone={loadTransactions} />}
              {canWrite && (
                <Button
                  type="button"
                  onClick={() => setShowNewTransactionModal(true)}
                >
                  <PlusIcon className="h-5 w-5" aria-hidden />
                  Neue Zahlung
                </Button>
              )}
            </>
          }
        />
        {salaryDay !== null && (
          <div className="mb-6 -mt-2 space-y-1">
            <SalaryMonthHint salaryDay={salaryDay} />
            <RecurringAnchorHint />
          </div>
        )}

        <div id="monthly-summary" className="card p-4 md:p-5 mb-8">
          <h3 className="text-base font-semibold mb-3 text-primary">Monatliche Belastung</h3>
          <div id="summary-grid" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <div id="monthly-total" className="rounded-control bg-income-bg p-3">
              <p className="text-xs text-income mb-1">Monatlich</p>
              <p className="amount text-lg text-income">
                {formatCurrency(Math.abs(totals.monthly.total))}
              </p>
            </div>
            <div id="quarterly-total" className="rounded-control bg-pending-bg p-3">
              <p className="text-xs text-pending mb-1">Vierteljährlich</p>
              <p className="amount text-lg text-pending">
                {formatCurrency(Math.abs(totals.quarterly.total))}
                <span className="block text-xs font-medium opacity-80">
                  ({formatCurrency(Math.abs(totals.quarterly.perMonth))}/M)
                </span>
              </p>
            </div>
            <div id="semiannual-total" className="rounded-control bg-expense-bg p-3">
              <p className="text-xs text-expense mb-1">Halbjährlich</p>
              <p className="amount text-lg text-expense">
                {formatCurrency(Math.abs(totals.semiannual.total))}
                <span className="block text-xs font-medium opacity-80">
                  ({formatCurrency(Math.abs(totals.semiannual.perMonth))}/M)
                </span>
              </p>
            </div>
            <div id="yearly-total" className="rounded-control bg-accent-subtle p-3">
              <p className="text-xs text-accent mb-1">Jährlich</p>
              <p className="amount text-lg text-accent">
                {formatCurrency(Math.abs(totals.yearly.total))}
                <span className="block text-xs font-medium opacity-80">
                  ({formatCurrency(Math.abs(totals.yearly.perMonth))}/M)
                </span>
              </p>
            </div>
            <div id="total-monthly" className="col-span-2 md:col-span-1 rounded-control bg-surface-muted p-3">
              <p className="text-xs text-secondary mb-1">Gesamt pro Monat</p>
              <p className="amount text-lg text-primary">
                {formatCurrency(Math.abs(totalMonthly))}
              </p>
            </div>
          </div>
        </div>

        <div id="transactions-table" className="card p-4 md:p-5 mb-8">
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
                  {canWrite && (
                    <th className="text-right p-4 text-secondary">Aktionen</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={canWrite ? 9 : 8} className="text-center p-4 text-sm text-secondary">
                      Keine wiederkehrenden Zahlungen vorhanden
                    </td>
                  </tr>
                ) : (
                  sortedTransactions.map((transaction) => {
                    const salaryStatus = getRecurringSalaryMonthStatus(transaction)
                    return (
                    <tr key={transaction.id} className="border-b border-border last:border-b-0">
                      <td className="p-4 text-sm text-primary">{resolveTransactionMerchantName(transaction)}</td>
                      <td className="p-4 text-sm text-primary">{transaction.description}</td>
                      <td className={`p-4 text-sm text-right ${
                        transaction.amount > 0 ? 'text-income' : 'text-expense'
                      }`}>
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="p-4 text-sm text-center text-primary">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRecurringIntervalBadgeClassName(transaction.recurringInterval)}`}>
                          {getRecurringIntervalLabel(transaction.recurringInterval)}
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
                      {canWrite && (
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
                      )}
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
                sortedTransactions.map((transaction) => (
                  <RecurringMobileCard
                    key={transaction.id}
                    transaction={transaction}
                    nextPaymentDate={getNextPaymentDate(transaction)}
                    canWrite={canWrite}
                    isTogglingPause={togglingPauseId === transaction.id}
                    onTogglePause={() => handleTogglePause(transaction)}
                    onCreateNextInstance={() => handleCreateNextInstance(transaction)}
                    onEdit={() => {
                      setSelectedTransactionId(transaction.id)
                      setShowEditTransactionModal(true)
                    }}
                  />
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