'use client'

import {
  ArrowPathIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
} from '@heroicons/react/24/outline'
import { formatDate } from '@/lib/dateUtils'
import { formatCurrency } from '@/lib/formatters'
import { resolveTransactionMerchantName } from '@/lib/merchantCategories'
import {
  getRecurringIntervalBadgeClassName,
  getRecurringIntervalLabel,
} from '@/lib/recurringIntervals'
import {
  getRecurringSalaryMonthStatus,
  type RecurringWithStatus,
} from '@/lib/recurringStatus'

type RecurringMobileCardProps = {
  transaction: RecurringWithStatus
  nextPaymentDate: Date
  canWrite: boolean
  isTogglingPause: boolean
  onTogglePause: () => void
  onCreateNextInstance: () => void
  onEdit: () => void
}

/** Wiederkehrende Zahlung als Karte (mobile Ansicht der Seite „Wiederkehrend“) */
export default function RecurringMobileCard({
  transaction,
  nextPaymentDate,
  canWrite,
  isTogglingPause,
  onTogglePause,
  onCreateNextInstance,
  onEdit,
}: RecurringMobileCardProps) {
  const salaryStatus = getRecurringSalaryMonthStatus(transaction)
  return (
    <div className="rounded-control bg-surface-muted/60 p-4">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            transaction.isRecurringPaused
              ? 'bg-surface text-secondary'
              : 'bg-accent-subtle text-accent'
          }`}
          aria-hidden="true"
        >
          {transaction.isRecurringPaused ? (
            <PauseIcon className="h-5 w-5" />
          ) : (
            <ArrowPathIcon className="h-5 w-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium text-primary">
            {resolveTransactionMerchantName(transaction)}
          </h3>
          {transaction.description && (
            <p className="truncate text-sm text-secondary">{transaction.description}</p>
          )}
        </div>
        <p
          className={`amount shrink-0 ${
            transaction.amount > 0 ? 'text-income' : 'text-primary'
          }`}
        >
          {formatCurrency(transaction.amount)}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 mb-3">
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
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRecurringIntervalBadgeClassName(transaction.recurringInterval)}`}>
          {getRecurringIntervalLabel(transaction.recurringInterval)}
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
              : formatDate(nextPaymentDate)}
          </div>
        </div>
      </div>

      {canWrite && (
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={onTogglePause}
          disabled={isTogglingPause}
          className="inline-flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-control bg-surface px-1 py-1.5 text-xs font-semibold text-primary transition-colors duration-feedback hover:bg-hairline disabled:opacity-50"
        >
          {transaction.isRecurringPaused ? (
            <>
              <PlayIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
              Fortsetzen
            </>
          ) : (
            <>
              <PauseIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
              Pausieren
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onCreateNextInstance}
          disabled={transaction.isRecurringPaused}
          className="inline-flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-control bg-surface px-1 py-1.5 text-xs font-semibold text-accent transition-colors duration-feedback hover:bg-accent-subtle disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ArrowPathIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
          Neue Instanz
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-control bg-surface px-1 py-1.5 text-xs font-semibold text-accent transition-colors duration-feedback hover:bg-accent-subtle"
        >
          <PencilIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
          Bearbeiten
        </button>
      </div>
      )}
    </div>
  )
}
