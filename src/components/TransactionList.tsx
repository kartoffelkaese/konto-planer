'use client'

import { Transaction } from '@/types'
import { formatDate, isTransactionDueInSalaryMonth } from '@/lib/dateUtils'
import { PencilIcon, CheckIcon, MinusCircleIcon, ClockIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { useToast } from '@/hooks/useToast'
import TransferBadge from '@/components/TransferBadge'
import EmptyState from '@/components/EmptyState'
import TransactionAvatar from '@/components/TransactionAvatar'
import { resolveTransactionCategory, resolveTransactionMerchantName } from '@/lib/merchantCategories'
import { ApiError, updateTransaction } from '@/lib/api'

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
          className={`flex w-full items-center gap-1 min-h-11 px-4 py-2.5 text-xs font-medium transition-colors duration-100 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${justify} ${
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
    'inline-flex items-center px-2.5 py-1 border border-transparent text-xs font-semibold rounded-full transition-colors duration-150 hover:border-current active:scale-95'

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

      await updateTransaction(transaction.id, updatedTransaction)

      if (transaction.parentTransactionId) {
        // Fehlerantwort nur protokollieren (wie bisher), Netzwerkfehler weiterreichen
        await updateTransaction(transaction.parentTransactionId, {
          lastConfirmedDate: currentDate,
        }).catch((err) => {
          if (!(err instanceof ApiError)) throw err
          console.error('Fehler beim Aktualisieren der Eltern-Transaktion')
        })
      }

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
      ? 'bg-income-bg text-income'
      : checkIsPending(transaction)
        ? 'bg-pending-bg text-pending'
        : 'bg-surface-muted text-secondary'

    return `${statusPillClass} ${stateClasses}${isToggling ? ' opacity-60 pointer-events-none' : ''}`
  }

  const handleEditClick = (transactionId: string) => {
    if (readOnly) return
    if (onEditTransaction) {
      onEditTransaction(transactionId)
    }
  }

  const getStatusLabel = (transaction: Transaction) =>
    transaction.isConfirmed ? 'Bestätigt' : checkIsPending(transaction) ? 'Ausstehend' : 'Offen'

  const formatSignedAmount = (amount: number) =>
    `${amount > 0 ? '+' : amount < 0 ? '−' : ''}${Math.abs(amount).toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} €`

  const amountClass = (amount: number) => (amount > 0 ? 'text-income' : 'text-primary')

  /** Gruppierung nach Tag nur bei Datums-Sortierung sinnvoll */
  const groupByDay = sortField === 'date'
  const dayKey = (value: string | Date) => {
    const d = new Date(value)
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  }
  const formatDayLabel = (value: string | Date) => {
    const d = new Date(value)
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)
    if (dayKey(d) === dayKey(today)) return 'Heute'
    if (dayKey(d) === dayKey(yesterday)) return 'Gestern'
    return d.toLocaleDateString('de-DE', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      ...(d.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}),
    })
  }

  const mobileStatusButton = (transaction: Transaction) => {
    const isToggling = togglingTransactionIds.includes(transaction.id)
    const label = getStatusLabel(transaction)
    const Icon = transaction.isConfirmed
      ? CheckIcon
      : checkIsPending(transaction)
        ? ClockIcon
        : MinusCircleIcon
    const tone = transaction.isConfirmed
      ? 'bg-income-bg text-income'
      : checkIsPending(transaction)
        ? 'bg-pending-bg text-pending'
        : 'bg-surface-muted text-secondary'
    const inner = (
      <span className={`flex h-8 w-8 items-center justify-center rounded-full ${tone}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
    )
    if (readOnly) {
      return (
        <span className="inline-flex min-h-11 min-w-11 items-center justify-center" title={label}>
          {inner}
          <span className="sr-only">{label}</span>
        </span>
      )
    }
    return (
      <button
        type="button"
        onClick={() => handleToggleConfirmation(transaction)}
        aria-label={`${label} – ${
          transaction.isConfirmed ? 'als nicht bestätigt markieren' : 'als bestätigt markieren'
        }`}
        className={`inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full${
          isToggling ? ' opacity-60 pointer-events-none' : ''
        }`}
      >
        {inner}
      </button>
    )
  }

  return (
    <div>
      {/* Desktop Ansicht */}
      <div className="hidden md:block overflow-x-auto -mx-4 md:-mx-5">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-hairline">
              <SortableHeader field="date" label="Datum" />
              <SortableHeader field="merchant" label="Händler" />
              <SortableHeader field="category" label="Kategorie" />
              <SortableHeader field="description" label="Beschreibung" />
              <SortableHeader field="amount" label="Betrag" align="right" />
              <SortableHeader field="status" label="Status" align="center" />
              {!readOnly && (
                <th className="px-4 py-3 text-right text-xs font-medium text-secondary">
                  <span className="sr-only">Aktionen</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {sortedTransactions.length === 0 ? (
              <tr>
                <td colSpan={readOnly ? 6 : 7}>{emptyList}</td>
              </tr>
            ) : (
              sortedTransactions.map((transaction, index) => {
                const category = resolveTransactionCategory(transaction)
                const merchantName = resolveTransactionMerchantName(transaction)
                return (
                  <tr
                    key={transaction.id}
                    ref={index === sortedTransactions.length - 1 ? lastElementRef : undefined}
                    className="group transition-colors duration-100 hover:bg-surface-muted/60"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary tabular-nums">
                      {readOnly ? (
                        <span>{formatDate(transaction.date)}</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleEditClick(transaction.id)}
                          className="hover:text-primary"
                        >
                          {formatDate(transaction.date)}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-primary">
                      <div className="flex items-center gap-3 min-w-0">
                        <TransactionAvatar
                          name={merchantName}
                          amount={transaction.amount}
                          color={category?.color}
                          className="h-8 w-8 text-xs"
                        />
                        <span className="font-medium truncate">{merchantName}</span>
                        <TransferBadge transaction={transaction} />
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {category ? (
                        <span className="inline-flex items-center gap-2 rounded-pill bg-surface-muted px-2.5 py-1 text-xs font-medium text-primary">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: category.color }}
                            aria-hidden="true"
                          />
                          {category.name}
                        </span>
                      ) : (
                        <span className="text-secondary">–</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-secondary">{transaction.description}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <span className={`amount text-sm ${amountClass(transaction.amount)}`}>
                        {formatSignedAmount(transaction.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      {readOnly ? (
                        <span className={getStatusPillClasses(transaction)}>
                          {getStatusLabel(transaction)}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleConfirmation(transaction)}
                          title={
                            transaction.isConfirmed
                              ? 'Als nicht bestätigt markieren'
                              : 'Als bestätigt markieren'
                          }
                          className={getStatusPillClasses(transaction)}
                        >
                          {getStatusLabel(transaction)}
                        </button>
                      )}
                    </td>
                    {!readOnly && (
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <button
                          type="button"
                          onClick={() => handleEditClick(transaction.id)}
                          title="Transaktion bearbeiten"
                          aria-label={`${merchantName} bearbeiten`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-secondary opacity-60 transition-opacity hover:bg-accent-subtle hover:text-accent group-hover:opacity-100 focus-visible:opacity-100"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Ansicht */}
      <div className="md:hidden">
        {onSort && (
          <div className="mb-3 flex items-center gap-2">
            <label htmlFor="tx-mobile-sort" className="sr-only">
              Sortieren nach
            </label>
            <select
              id="tx-mobile-sort"
              value={sortField}
              onChange={(e) => handleSort(e.target.value as SortField)}
              className="min-h-11 flex-1 rounded-pill text-sm"
            >
              <option value="date">Sortiert nach Datum</option>
              <option value="merchant">Sortiert nach Händler</option>
              <option value="category">Sortiert nach Kategorie</option>
              <option value="description">Sortiert nach Beschreibung</option>
              <option value="amount">Sortiert nach Betrag</option>
              <option value="status">Sortiert nach Status</option>
            </select>
            <button
              type="button"
              onClick={() => handleSort(sortField)}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-muted text-primary hover:bg-accent-subtle hover:text-accent"
              aria-label={`Sortierung ${sortDirection === 'asc' ? 'aufsteigend' : 'absteigend'}`}
            >
              {sortDirection === 'asc' ? (
                <ChevronUpIcon className="h-5 w-5" aria-hidden="true" />
              ) : (
                <ChevronDownIcon className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        )}
        {sortedTransactions.length === 0 ? (
          emptyList
        ) : (
          <ul className="-mx-2">
            {sortedTransactions.map((transaction, index) => {
              const category = resolveTransactionCategory(transaction)
              const merchantName = resolveTransactionMerchantName(transaction)
              const prev = sortedTransactions[index - 1]
              const showDayHeader =
                groupByDay && (!prev || dayKey(prev.date) !== dayKey(transaction.date))
              const statusLabel = getStatusLabel(transaction)
              const subline = [
                groupByDay ? null : formatDate(transaction.date),
                category?.name,
                transaction.description,
              ]
                .filter(Boolean)
                .join(' · ')

              const rowContent = (
                <>
                  <TransactionAvatar
                    name={merchantName}
                    amount={transaction.amount}
                    color={category?.color}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-primary truncate">
                      {merchantName}
                    </span>
                    <span className="flex items-center gap-1.5 min-w-0 text-sm text-secondary">
                      {checkIsPending(transaction) && (
                        <span className="shrink-0 rounded-pill bg-pending-bg px-2 py-0.5 text-[11px] font-semibold text-pending">
                          {statusLabel}
                        </span>
                      )}
                      <TransferBadge transaction={transaction} className="shrink" />
                      <span className="truncate">{subline || '–'}</span>
                    </span>
                  </span>
                  <span className={`amount shrink-0 ${amountClass(transaction.amount)}`}>
                    {formatSignedAmount(transaction.amount)}
                  </span>
                </>
              )

              return (
                <li
                  key={transaction.id}
                  ref={index === sortedTransactions.length - 1 ? lastElementRef : undefined}
                >
                  {showDayHeader && (
                    <p className="eyebrow sticky top-14 z-10 -mx-2 bg-surface/95 px-4 pb-1.5 pt-4 backdrop-blur-sm first:pt-1">
                      {formatDayLabel(transaction.date)}
                    </p>
                  )}
                  <div className="flex items-center gap-1 rounded-control pl-2 transition-colors hover:bg-surface-muted/60">
                    {readOnly ? (
                      <div className="flex min-w-0 flex-1 items-center gap-3 py-2.5">
                        {rowContent}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleEditClick(transaction.id)}
                        aria-label={`${merchantName}, ${formatSignedAmount(transaction.amount)} – bearbeiten`}
                        className="flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left active:!scale-100"
                      >
                        {rowContent}
                      </button>
                    )}
                    {mobileStatusButton(transaction)}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
} 