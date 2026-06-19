'use client'

import Link from 'next/link'
import { Transaction } from '@/types'
import { formatDate, isTransactionDueInSalaryMonth } from '@/lib/dateUtils'
import { formatCurrency } from '@/lib/formatters'
import { PencilIcon, CheckIcon, MinusCircleIcon, ClockIcon, CalendarIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'
import ConfirmDialog from '@/components/ConfirmDialog'
import { getContrastColor } from '@/lib/colorUtils'
import { useToast } from '@/hooks/useToast'
import TransferBadge from '@/components/TransferBadge'
import EmptyState from '@/components/EmptyState'
import { resolveTransactionCategory, resolveTransactionMerchantName } from '@/lib/merchantCategories'

type SortField = 'date' | 'merchant' | 'category' | 'description' | 'amount' | 'status'
type SortDirection = 'asc' | 'desc'

interface TransactionListProps {
  transactions: Transaction[]
  onTransactionChange: () => void
  onToggleConfirmation?: (transaction: Transaction) => void | Promise<void>
  togglingTransactionIds?: string[]
  lastElementRef: (node: HTMLElement | null) => void
  sortField?: SortField
  sortDirection?: SortDirection
  onSort?: (field: SortField) => void
  salaryDay?: number | null
  onAddTransaction?: () => void
  onEditTransaction?: (id: string) => void
  isSearchActive?: boolean
  isPeriodFilterActive?: boolean
  readOnly?: boolean
}

export default function TransactionList({ 
  transactions, 
  onTransactionChange,
  onToggleConfirmation,
  togglingTransactionIds = [],
  lastElementRef,
  sortField = 'date',
  sortDirection = 'desc',
  onSort,
  salaryDay,
  onAddTransaction,
  onEditTransaction,
  isSearchActive = false,
  isPeriodFilterActive = false,
  readOnly = false,
}: TransactionListProps) {
  const { showToast } = useToast()
  const [editingDate, setEditingDate] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Hilfsfunktion für isTransactionPending mit salaryDay
  const checkIsPending = (transaction: Transaction): boolean => {
    if (salaryDay === null || salaryDay === undefined) return false
    return transaction.isRecurring && 
           isTransactionDueInSalaryMonth({
             date: new Date(transaction.date),
             isRecurring: transaction.isRecurring,
             recurringInterval: transaction.recurringInterval,
             lastConfirmedDate: transaction.lastConfirmedDate ? new Date(transaction.lastConfirmedDate) : undefined
           }, salaryDay) && 
           !transaction.isConfirmed
  }

  // Sortiere Transaktionen clientseitig
  const sortedTransactions = [...transactions].sort((a, b) => {
    let comparison = 0

    switch (sortField) {
      case 'date':
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
        break
      case 'merchant':
        comparison = resolveTransactionMerchantName(a).localeCompare(
          resolveTransactionMerchantName(b)
        )
        break
      case 'category':
        const categoryA = resolveTransactionCategory(a)?.name || ''
        const categoryB = resolveTransactionCategory(b)?.name || ''
        comparison = categoryA.localeCompare(categoryB)
        break
      case 'description':
        comparison = (a.description || '').localeCompare(b.description || '')
        break
      case 'amount':
        comparison = a.amount - b.amount
        break
      case 'status':
        // Status: bestätigt > ausstehend > offen
        const statusA = a.isConfirmed ? 3 : checkIsPending(a) ? 2 : 1
        const statusB = b.isConfirmed ? 3 : checkIsPending(b) ? 2 : 1
        comparison = statusA - statusB
        break
    }

    return sortDirection === 'asc' ? comparison : -comparison
  })

  const handleSort = (field: SortField) => {
    if (onSort) {
      onSort(field)
    }
  }

  const getSortAria = (field: SortField): 'ascending' | 'descending' | 'none' => {
    if (sortField !== field) return 'none'
    return sortDirection === 'asc' ? 'ascending' : 'descending'
  }

  const SortableHeader = ({
    field,
    label,
    align = 'left',
  }: {
    field: SortField
    label: string
    align?: 'left' | 'right' | 'center'
  }) => {
    const justify =
      align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'
    const isActive = sortField === field
    return (
      <th className="p-0" aria-sort={getSortAria(field)}>
        <button
          type="button"
          onClick={() => handleSort(field)}
          className={`flex w-full items-center gap-1 min-h-12 px-4 py-3 text-sm font-medium transition-colors duration-100 hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent ${justify} ${
            isActive ? 'text-primary' : 'text-secondary'
          }`}
        >
          <span>{label}</span>
          <SortIcon field={field} />
        </button>
      </th>
    )
  }

  const emptyList = (
    <EmptyState
      title={
        isSearchActive
          ? 'Keine Treffer'
          : isPeriodFilterActive
            ? 'Keine Buchungen in diesem Zeitraum'
            : 'Keine Transaktionen vorhanden'
      }
      description={
        isSearchActive
          ? 'Passen Sie die Suche an oder ändern Sie den Zeitraum.'
          : isPeriodFilterActive
            ? 'Wählen Sie einen anderen Zeitraum oder setzen Sie den Filter zurück.'
            : 'Erfassen Sie Ihre erste Einnahme oder Ausgabe.'
      }
      actionLabel={
        isSearchActive || isPeriodFilterActive
          ? undefined
          : !readOnly && onAddTransaction
            ? 'Erste Transaktion anlegen'
            : undefined
      }
      onAction={
        isSearchActive || isPeriodFilterActive || readOnly ? undefined : onAddTransaction
      }
    />
  )

  const statusPillClass =
    'inline-flex items-center px-2.5 py-1.5 border text-xs font-medium rounded-full transition-colors duration-150 active:scale-95'

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <span className="inline-block w-4 h-4 opacity-30 transition-opacity duration-150">
          <ChevronUpIcon className="h-4 w-4" />
        </span>
      )
    }
    return sortDirection === 'asc' ? (
      <ChevronUpIcon className="h-4 w-4 transition-transform duration-150" />
    ) : (
      <ChevronDownIcon className="h-4 w-4 transition-transform duration-150" />
    )
  }

  const handleToggleConfirmation = async (transaction: Transaction) => {
    if (onToggleConfirmation) {
      await onToggleConfirmation(transaction)
      return
    }

    try {
      const currentDate = new Date().toISOString()
      const updatedTransaction = {
        ...transaction,
        isConfirmed: !transaction.isConfirmed,
        lastConfirmedDate: !transaction.isConfirmed ? currentDate : null,
      }

      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTransaction),
      })

      if (!response.ok) {
        throw new Error('Fehler beim Aktualisieren der Transaktion')
      }

      if (transaction.parentTransactionId) {
        const parentResponse = await fetch(`/api/transactions/${transaction.parentTransactionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lastConfirmedDate: currentDate }),
        })

        if (!parentResponse.ok) {
          console.error('Fehler beim Aktualisieren der Eltern-Transaktion')
        }
      }

      setEditingDate(null)
      await onTransactionChange()
      showToast('Status aktualisiert', 'success')
    } catch (err) {
      console.error('Fehler beim Aktualisieren der Transaktion:', err)
      showToast('Status konnte nicht geändert werden', 'error')
    }
  }

  const getStatusPillClasses = (transaction: Transaction) => {
    const isToggling = togglingTransactionIds.includes(transaction.id)
    const stateClasses = transaction.isConfirmed
      ? 'bg-income-bg text-income border-income/30'
      : checkIsPending(transaction)
        ? 'bg-pending-bg text-pending border-pending/30'
        : 'bg-surface-muted text-secondary border-border'

    return `${statusPillClass} ${stateClasses}${isToggling ? ' opacity-60 pointer-events-none' : ''}`
  }

  const handleUpdateDate = async (transaction: Transaction, newDate: string) => {
    try {
      const updatedTransaction = {
        ...transaction,
        date: newDate,
        lastConfirmedDate: transaction.isConfirmed ? newDate : transaction.lastConfirmedDate
      }
      
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedTransaction),
      })

      if (!response.ok) {
        throw new Error('Fehler beim Aktualisieren der Transaktion')
      }

      setEditingDate(null)
      await onTransactionChange()
      showToast('Datum aktualisiert', 'success')
    } catch (err) {
      console.error('Fehler beim Aktualisieren der Transaktion:', err)
      showToast('Datum konnte nicht geändert werden', 'error')
    }
  }

  const handleEditClick = (transactionId: string) => {
    if (readOnly) return
    if (onEditTransaction) {
      onEditTransaction(transactionId)
    }
  }

  const handleConfirmTransaction = async (id: string) => {
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isConfirmed: true,
          lastConfirmedDate: new Date().toISOString()
        }),
      })

      if (!response.ok) {
        throw new Error('Fehler beim Bestätigen der Transaktion')
      }

      await onTransactionChange()
    } catch (err) {
      console.error('Error confirming transaction:', err)
      setError('Fehler beim Bestätigen der Transaktion')
    }
  }

  const handleDeleteTransaction = (transaction: Transaction) => {
    setDeleteTarget({
      id: transaction.id,
      label:
        resolveTransactionMerchantName(transaction) ||
        transaction.description ||
        'diese Transaktion',
    })
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/transactions/${deleteTarget.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Fehler beim Löschen der Transaktion')
      }

      setDeleteTarget(null)
      await onTransactionChange()
      showToast('Transaktion gelöscht', 'success')
    } catch (err) {
      console.error('Error deleting transaction:', err)
      setError('Fehler beim Löschen der Transaktion')
      showToast('Fehler beim Löschen der Transaktion', 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="overflow-hidden">
      {/* Desktop Ansicht */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead>
            <tr className="border-b border-accent-border bg-accent-subtle">
              <SortableHeader field="date" label="Datum" />
              <SortableHeader field="merchant" label="Händler" />
              <SortableHeader field="category" label="Kategorie" />
              <SortableHeader field="description" label="Beschreibung" />
              <SortableHeader field="amount" label="Betrag" align="right" />
              <SortableHeader field="status" label="Status" align="center" />
              {!readOnly && (
                <th className="text-right p-4 text-secondary text-sm font-medium">Aktionen</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-canvas">
            {sortedTransactions.length === 0 ? (
              <tr>
                <td colSpan={readOnly ? 6 : 7}>{emptyList}</td>
              </tr>
            ) : (
              sortedTransactions.map((transaction, index) => (
                <tr 
                  key={transaction.id} 
                  ref={index === sortedTransactions.length - 1 ? lastElementRef : undefined}
                  className="transition-colors duration-100 hover:bg-surface-muted"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                    <div className="flex items-center">
                      {readOnly ? (
                        <span>{formatDate(transaction.date)}</span>
                      ) : (
                        <button
                          onClick={() => handleEditClick(transaction.id)}
                          className="text-secondary hover:text-primary"
                        >
                          {formatDate(transaction.date)}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                    <span>{resolveTransactionMerchantName(transaction)}</span>
                    <TransferBadge transaction={transaction} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {(() => {
                      const category = resolveTransactionCategory(transaction)
                      return category ? (
                      <span 
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: category.color,
                          color: getContrastColor(category.color)
                        }}
                      >
                        {category.name}
                      </span>
                    ) : (
                      <span className="text-secondary">-</span>
                    )
                    })()}
                  </td>
                  <td className="px-6 py-4 text-sm text-primary">
                    {transaction.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span className={transaction.amount > 0 ? 'text-income' : transaction.amount < 0 ? 'text-expense' : 'text-primary'}>
                      {transaction.amount > 0 ? '+' : transaction.amount < 0 ? '-' : ''}{Math.abs(transaction.amount).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    {readOnly ? (
                      <span className={getStatusPillClasses(transaction)}>
                        {transaction.isConfirmed ? 'Bestätigt' : checkIsPending(transaction) ? 'Ausstehend' : 'Offen'}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleToggleConfirmation(transaction)}
                        title={transaction.isConfirmed ? 'Als nicht bestätigt markieren' : 'Als bestätigt markieren'}
                        className={getStatusPillClasses(transaction)}
                      >
                        {transaction.isConfirmed ? 'Bestätigt' : checkIsPending(transaction) ? 'Ausstehend' : 'Offen'}
                      </button>
                    )}
                  </td>
                  {!readOnly && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEditClick(transaction.id)}
                      title="Transaktion bearbeiten"
                      className="text-accent hover:opacity-80"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                  </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Ansicht */}
      <div className="md:hidden space-y-4">
        {onSort && (
          <div className="flex flex-wrap items-center gap-2 rounded-card border border-border bg-surface p-3">
            <label htmlFor="tx-mobile-sort" className="text-sm font-medium text-secondary shrink-0">
              Sortieren
            </label>
            <select
              id="tx-mobile-sort"
              value={sortField}
              onChange={(e) => handleSort(e.target.value as SortField)}
              className="min-h-11 flex-1 rounded-control border-border bg-canvas text-sm text-primary shadow-sm focus:border-accent focus:ring-accent"
            >
              <option value="date">Datum</option>
              <option value="merchant">Händler</option>
              <option value="category">Kategorie</option>
              <option value="description">Beschreibung</option>
              <option value="amount">Betrag</option>
              <option value="status">Status</option>
            </select>
            <button
              type="button"
              onClick={() => handleSort(sortField)}
              className="inline-flex min-h-11 items-center rounded-control border border-border bg-canvas px-3 text-sm font-medium text-primary hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label={`Sortierung ${sortDirection === 'asc' ? 'aufsteigend' : 'absteigend'}`}
            >
              {sortDirection === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        )}
        {sortedTransactions.length === 0 ? (
          emptyList
        ) : (
          sortedTransactions.map((transaction, index) => (
            <div
              key={transaction.id}
              ref={index === sortedTransactions.length - 1 ? lastElementRef : undefined}
              className="bg-canvas rounded-lg shadow-sm border border-border p-4 space-y-2"
            >
              <div className="flex justify-between items-start">
                <div>
                  {readOnly ? (
                    <span className="text-sm font-medium text-primary">
                      {formatDate(transaction.date)}
                    </span>
                  ) : (
                    <button
                      onClick={() => handleEditClick(transaction.id)}
                      className="text-sm font-medium text-primary"
                    >
                      {formatDate(transaction.date)}
                    </button>
                  )}
                  <div className="text-sm text-secondary">
                    {resolveTransactionMerchantName(transaction)}
                    <TransferBadge transaction={transaction} />
                  </div>
                </div>
                <span className={`text-sm font-medium ${
                  transaction.amount > 0 ? 'text-income' : transaction.amount < 0 ? 'text-expense' : 'text-primary'
                }`}>
                  {transaction.amount > 0 ? '+' : transaction.amount < 0 ? '-' : ''}{Math.abs(transaction.amount).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {(() => {
                    const category = resolveTransactionCategory(transaction)
                    return category ? (
                      <span 
                        className="inline-flex shrink-0 items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: category.color,
                          color: getContrastColor(category.color)
                        }}
                      >
                        {category.name}
                      </span>
                  ) : (
                    <span className="text-secondary shrink-0">-</span>
                  )
                  })()}
                  {transaction.description ? (
                    <span className="min-w-0 truncate text-sm text-secondary">
                      {transaction.description}
                    </span>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {readOnly ? (
                    <span className={getStatusPillClasses(transaction)}>
                      {transaction.isConfirmed ? 'Bestätigt' : checkIsPending(transaction) ? 'Ausstehend' : 'Offen'}
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => handleToggleConfirmation(transaction)}
                        title={transaction.isConfirmed ? 'Als nicht bestätigt markieren' : 'Als bestätigt markieren'}
                        className={getStatusPillClasses(transaction)}
                      >
                        {transaction.isConfirmed ? 'Bestätigt' : checkIsPending(transaction) ? 'Ausstehend' : 'Offen'}
                      </button>
                      <button
                        onClick={() => handleEditClick(transaction.id)}
                        title="Transaktion bearbeiten"
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control text-accent hover:bg-surface-muted hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Transaktion löschen"
        message={`Möchten Sie „${deleteTarget?.label}“ wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
        confirmText="Löschen"
        confirmLoadingText="Wird gelöscht…"
        cancelText="Abbrechen"
        type="danger"
        loading={isDeleting}
      />
    </div>
  )
} 