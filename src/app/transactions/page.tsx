'use client'

import { Suspense, useState, useCallback } from 'react'
import { PlusIcon } from '@heroicons/react/24/outline'
import { createPendingInstances, getRecurringTransactions } from '@/lib/api'
import { useApiQuery } from '@/hooks/useApiQuery'
import { hasDueRecurringWithoutInstance } from '@/lib/recurringStatus'
import { isPeriodFilterActive } from '@/lib/transactionPeriodRange'
import TransactionList from '@/components/TransactionList'
import TransactionPeriodFilter from '@/components/TransactionPeriodFilter'
import MonthlyOverview from '@/components/MonthlyOverview'
import Modal from '@/components/Modal'
import TransactionForm from '@/components/TransactionForm'
import EditTransactionForm from '@/components/EditTransactionForm'
import { useToast } from '@/hooks/useToast'
import { Button } from '@/components/Button'
import PendingUndoButton from '@/components/PendingUndoButton'
import { usePendingUndo } from '@/contexts/PendingUndoContext'
import TransactionCsvImport from '@/components/TransactionCsvImport'
import PageLoader from '@/components/PageLoader'
import PageError from '@/components/PageError'
import LoadingSpinner from '@/components/LoadingSpinner'
import SalaryMonthHint from '@/components/SalaryMonthHint'
import PageContextHeader from '@/components/PageContextHeader'
import { useUserSettings } from '@/hooks/useUserSettings'
import { useActiveAccountReload } from '@/hooks/useActiveAccountReload'
import { useTransactionFilters } from './useTransactionFilters'
import { useTransactionList } from './useTransactionList'
import { useTransactionDialogs } from './useTransactionDialogs'

function TransactionsPageContent() {
  const { salaryDay, accountName, loading: settingsLoading, canWrite, isSimpleAccount } = useUserSettings()
  const { showToast } = useToast()
  const { registerCreated } = usePendingUndo()

  const {
    period,
    customStartDate,
    customEndDate,
    customPeriodBlocked,
    searchQuery,
    setSearchQuery,
    debouncedSearch,
    sortField,
    sortDirection,
    handleSort,
    changePeriod,
    changeCustomRange,
    resetFilters,
  } = useTransactionFilters()

  const {
    transactions,
    loading,
    error,
    setError,
    page,
    hasMore,
    totals,
    periodLabel,
    loadingRef,
    lastElementRef,
    togglingTransactionIds,
    loadTotals,
    loadTransactions,
    handleToggleConfirmation,
  } = useTransactionList({
    salaryDay,
    period,
    customStartDate,
    customEndDate,
    debouncedSearch,
    customPeriodBlocked,
  })

  const {
    showNewTransactionModal,
    showEditTransactionModal,
    selectedTransactionId,
    openNewTransaction,
    closeNewTransaction,
    openEditTransaction,
    closeEditTransaction,
    finishEditTransaction,
  } = useTransactionDialogs()

  // „Ausstehende erstellen“ nur anbieten, wenn eine wiederkehrende Zahlung fällig ist und noch keine Buchung hat
  const canCreatePending = !settingsLoading && !isSimpleAccount && canWrite
  const { data: recurringTemplates, reload: reloadRecurringTemplates } = useApiQuery(
    'recurring-templates',
    getRecurringTransactions,
    { enabled: canCreatePending }
  )

  const [isCreatingPending, setIsCreatingPending] = useState(false)

  useActiveAccountReload(() => {
    reloadRecurringTemplates()
    if (salaryDay !== null && !customPeriodBlocked) {
      void loadTransactions(1, false)
      void loadTotals()
    }
  })

  const handleTransactionChange = useCallback(async () => {
    reloadRecurringTemplates()
    await loadTotals()
    await loadTransactions(page, false)
  }, [reloadRecurringTemplates, loadTotals, loadTransactions, page])

  const handleCreatePending = async () => {
    setIsCreatingPending(true)
    try {
      const created = await createPendingInstances()
      await handleTransactionChange()
      registerCreated(created)
    } catch (err) {
      console.error('Error creating pending instances:', err)
      setError('Fehler beim Erstellen der ausstehenden Zahlungen')
      showToast('Fehler beim Erstellen der ausstehenden Zahlungen', 'error')
    } finally {
      setIsCreatingPending(false)
    }
  }

  const handleEditTransactionSuccess = async () => {
    finishEditTransaction()
    await handleTransactionChange()
  }

  const handleNewTransactionSuccess = async () => {
    closeNewTransaction()
    await handleTransactionChange()
  }

  const showPendingAction = canCreatePending && hasDueRecurringWithoutInstance(recurringTemplates ?? [])

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
    <div id="transaction-page" className="min-h-screen bg-canvas pb-[calc(6rem+env(safe-area-inset-bottom,0px))] md:pb-8">
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
                  onClick={handleCreatePending}
                  loading={isCreatingPending}
                  loadingText="Wird erstellt…"
                  title="Erstellt Buchungen für fällige wiederkehrende Zahlungen im aktuellen Gehaltsmonat"
                  aria-label="Ausstehende Zahlungen für den Gehaltsmonat erstellen"
                >
                  Ausstehende erstellen
                </Button>
              )}
              {canWrite && <PendingUndoButton onUndone={handleTransactionChange} />}
              {canWrite && (
                <>
                  <TransactionCsvImport
                    onImported={() => {
                      void loadTotals()
                      void loadTransactions(1, false)
                    }}
                  />
                  <Button
                    type="button"
                    className="max-md:hidden shrink-0"
                    onClick={openNewTransaction}
                  >
                    <PlusIcon className="h-5 w-5" aria-hidden />
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
            onPeriodChange={changePeriod}
            onCustomRangeChange={changeCustomRange}
            onReset={resetFilters}
          />
        )}

        <div
          id="monthly-overview-section"
          className="mb-6"
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
          className="card p-4 md:p-5 mb-8"
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
            onAddTransaction={canWrite ? openNewTransaction : undefined}
            onEditTransaction={canWrite ? openEditTransaction : undefined}
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
        onClose={closeNewTransaction}
        title="Neue Transaktion"
        maxWidth="md"
      >
        <TransactionForm
          onSuccess={handleNewTransactionSuccess}
          onCancel={closeNewTransaction}
          hideRecurring={isSimpleAccount}
        />
      </Modal>

      <Modal
        isOpen={showEditTransactionModal}
        onClose={closeEditTransaction}
        title="Transaktion bearbeiten"
        maxWidth="md"
      >
        {selectedTransactionId && (
          <EditTransactionForm
            id={selectedTransactionId}
            onSuccess={handleEditTransactionSuccess}
            onCancel={closeEditTransaction}
            hideRecurring={isSimpleAccount}
          />
        )}
      </Modal>

      {canWrite && (
      <Button
        type="button"
        className="md:hidden fixed bottom-[calc(1rem+var(--mobile-tabbar-space,env(safe-area-inset-bottom,0px)))] right-[calc(1.5rem+env(safe-area-inset-right,0px))] z-30 h-14 w-14 min-w-14 rounded-full p-0 shadow-lg"
        onClick={openNewTransaction}
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
