'use client'

import { useMemo } from 'react'
import {
  ArrowLongRightIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ReceiptPercentIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@/components/Button'
import { formatCurrency } from '@/lib/formatters'
import { formatDate } from '@/lib/dateUtils'
import SplitAmountDisplay from '@/components/split/SplitAmountDisplay'
import {
  formatSplitExpenseAmount,
  splitExpenseAmountClass,
} from '@/lib/splitFormatters'
import type {
  SplitExpense,
  SplitExpenseGuest,
  SplitHistoryResponse,
  SplitHistoryGuestResponse,
  SplitSettlement,
  SplitSettlementGuest,
} from '@/types/split'
import {
  splitSectionCardClass,
} from '@/components/split/splitUiClasses'
import { getParticipantInitials } from '@/components/split/splitParticipantUtils'

type SplitHistoryViewData = SplitHistoryResponse | SplitHistoryGuestResponse

type SplitHistoryViewProps = {
  history: SplitHistoryViewData
  participantCount?: number
  groupByCategory?: boolean
  onDeleteSettlement?: (settlementId: string) => void
}

function formatShareLabel(shareCount: number, participantCount: number): string {
  if (participantCount <= 0) return `${shareCount} Personen`
  if (shareCount >= participantCount) return 'Alle'
  if (shareCount === 1) return '1 Person'
  return `${shareCount} Personen`
}

function SettlementRow({
  settlement,
  onDelete,
}: {
  settlement: SplitSettlement | SplitSettlementGuest
  onDelete?: (settlementId: string) => void
}) {
  const fromName = settlement.fromParticipant?.displayName ?? '?'
  const toName = settlement.toParticipant?.displayName ?? '?'

  return (
    <li className="group rounded-control px-2 py-2.5 transition-colors hover:bg-surface-muted/60">
      <div className="mb-2 flex items-center justify-between gap-3 sm:hidden">
        <p className="text-sm tabular-nums text-secondary">{formatDate(settlement.settledAt)}</p>
        <span className="text-sm font-semibold tabular-nums text-primary">
          {formatCurrency(settlement.amount)}
        </span>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <div className="hidden w-28 shrink-0 sm:block">
          <p className="text-sm tabular-nums text-secondary">{formatDate(settlement.settledAt)}</p>
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-[11px] font-semibold text-accent"
          aria-hidden="true"
        >
          {getParticipantInitials(fromName) || '?'}
        </span>
        <span className="font-medium text-primary">{fromName}</span>
        <ArrowLongRightIcon className="h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
        <span
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-[11px] font-semibold text-accent"
          aria-hidden="true"
        >
          {getParticipantInitials(toName) || '?'}
        </span>
        <span className="font-medium text-primary">{toName}</span>
      </div>

        <div className="hidden flex-col items-end gap-0.5 sm:flex sm:shrink-0">
          <span className="text-sm font-semibold tabular-nums text-primary">
            {formatCurrency(settlement.amount)}
          </span>
          {settlement.note && (
            <span className="max-w-xs text-right text-xs text-secondary">{settlement.note}</span>
          )}
        </div>

        {onDelete && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="self-end max-md:min-h-11 max-md:min-w-11 sm:opacity-60 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
            onClick={() => onDelete(settlement.id)}
            aria-label={`Ausgleich ${fromName} an ${toName} löschen`}
          >
            <TrashIcon className="h-4 w-4 text-expense" aria-hidden="true" />
          </Button>
        )}
      </div>

      {settlement.note && (
        <p className="mt-1 text-xs text-secondary sm:hidden">{settlement.note}</p>
      )}
    </li>
  )
}

function ExpenseHistoryRow({
  expense,
  participantCount,
}: {
  expense: SplitExpense | SplitExpenseGuest
  participantCount: number
}) {
  const payerName = expense.paidBy?.displayName ?? '?'

  return (
    <li className="flex items-center gap-3 rounded-control px-2 py-2.5 transition-colors hover:bg-surface-muted/60">
      <span
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-secondary"
        title={`Bezahlt von ${payerName}`}
        aria-hidden="true"
      >
        {getParticipantInitials(payerName) || '?'}
      </span>

      <div className="min-w-0 flex-1">
        <p className="font-medium text-primary truncate">{expense.description}</p>
        <p className="text-sm text-secondary truncate">
          <span className="tabular-nums">{formatDate(expense.date)}</span>
          {' · '}
          {payerName}
          {' · '}
          {formatShareLabel(expense.shareParticipantIds.length, participantCount)}
        </p>
      </div>

      <SplitAmountDisplay
        amount={expense.amount}
        originalAmount={expense.originalAmount}
        originalCurrencyCode={expense.originalCurrencyCode}
        exchangeRate={expense.exchangeRate}
        exchangeRateDate={expense.exchangeRateDate}
        className="amount shrink-0"
      />
    </li>
  )
}

type CategoryGroup = {
  categoryId: string | null
  categoryName: string
  total: number
  color: string | null
  expenses: Array<SplitExpense | SplitExpenseGuest>
}

export default function SplitHistoryView({
  history,
  participantCount = 0,
  groupByCategory = true,
  onDeleteSettlement,
}: SplitHistoryViewProps) {
  const totalSettled = useMemo(
    () => history.settlements.reduce((sum, settlement) => sum + settlement.amount, 0),
    [history.settlements]
  )

  const expensesByCategory = useMemo(() => {
    const groups: CategoryGroup[] = groupByCategory
      ? history.categoryTotals.map((group) => ({
          ...group,
          color:
            history.expenses.find((expense) =>
              group.categoryId == null
                ? expense.categoryId == null
                : expense.categoryId === group.categoryId
            )?.category?.color ?? null,
          expenses: history.expenses.filter((expense) =>
            group.categoryId == null
              ? expense.categoryId == null
              : expense.categoryId === group.categoryId
          ),
        }))
      : [
          {
            categoryId: null,
            categoryName: 'Alle Ausgaben',
            total: history.totalExpenses,
            color: null,
            expenses: history.expenses,
          },
        ]

    return groups.filter((group) => group.expenses.length > 0)
  }, [groupByCategory, history.categoryTotals, history.expenses, history.totalExpenses])

  const isEmpty = history.expenses.length === 0 && history.settlements.length === 0

  if (isEmpty) {
    return (
      <div className="card px-4 py-10 text-center text-sm text-secondary">
        Noch keine Historie — Ausgaben und Ausgleiche erscheinen hier, sobald sie erfasst werden.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <section className="hero-card p-6 md:p-8">
        <p className="eyebrow">Gesamtausgaben</p>
        <p className="amount-hero mt-2 text-primary">{formatCurrency(history.totalExpenses)}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="chip">
            {history.expenses.length} {history.expenses.length === 1 ? 'Ausgabe' : 'Ausgaben'}
          </span>
          {history.settlements.length > 0 && (
            <span className="chip">
              {history.settlements.length}{' '}
              {history.settlements.length === 1 ? 'Ausgleich' : 'Ausgleiche'} ·{' '}
              <span className="amount text-income">{formatCurrency(totalSettled)}</span>
            </span>
          )}
          {expensesByCategory.length > 0 && (
            <span className="chip">
              {expensesByCategory.length}{' '}
              {expensesByCategory.length === 1 ? 'Kategorie' : 'Kategorien'}
            </span>
          )}
        </div>
      </section>

      <section className={`${splitSectionCardClass} overflow-hidden p-0`}>
        <header className="flex items-start gap-3 px-4 pt-4 pb-2 md:px-5 md:pt-5">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-accent">
            <BanknotesIcon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-base font-semibold text-primary">Ausgleichszahlungen</h3>
            <p className="text-xs text-secondary">
              Erledigte Überweisungen zwischen Teilnehmern
            </p>
          </div>
        </header>

        {history.settlements.length === 0 ? (
          <div className="flex items-start gap-3 px-4 py-6 text-sm text-secondary">
            <CheckCircleIcon className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
            <p>Noch keine Ausgleiche erfasst.</p>
          </div>
        ) : (
          <ul className="px-2 pb-2 md:px-3 md:pb-3">
            {history.settlements.map((settlement) => (
              <SettlementRow
                key={settlement.id}
                settlement={settlement}
                onDelete={onDeleteSettlement}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-accent">
            <ReceiptPercentIcon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-base font-semibold text-primary">Ausgaben nach Kategorie</h3>
            <p className="text-xs text-secondary">
              Chronologisch sortiert, gruppiert nach Kategorie
            </p>
          </div>
        </div>

        {history.expenses.length === 0 ? (
          <div className="card px-4 py-6 text-center text-sm text-secondary">
            Noch keine Ausgaben in der Historie.
          </div>
        ) : (
          <div className="space-y-4">
            {expensesByCategory.map((group) => (
              <section
                key={group.categoryName}
                className={`${splitSectionCardClass} overflow-hidden p-0`}
              >
                <header className="flex items-center justify-between gap-3 px-4 pt-4 pb-2 md:px-5 md:pt-5">
                  <div className="flex min-w-0 items-center gap-2">
                    {group.color && (
                      <span
                        className="inline-flex h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: group.color }}
                        aria-hidden="true"
                      />
                    )}
                    <div>
                      <h4 className="truncate font-semibold text-primary">
                        {group.categoryName}
                      </h4>
                      <p className="text-xs text-secondary">
                        {group.expenses.length}{' '}
                        {group.expenses.length === 1 ? 'Posten' : 'Posten'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="eyebrow">Summe</p>
                    <p className={`amount ${splitExpenseAmountClass(group.total)}`}>
                      {formatSplitExpenseAmount(group.total)}
                    </p>
                  </div>
                </header>

                <ul className="px-2 pb-2 md:px-3 md:pb-3">
                  {group.expenses.map((expense) => (
                    <ExpenseHistoryRow
                      key={expense.id}
                      expense={expense}
                      participantCount={participantCount}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
