'use client'

import { useMemo } from 'react'
import {
  ArrowLongRightIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ReceiptPercentIcon,
} from '@heroicons/react/24/outline'
import { formatCurrency } from '@/lib/formatters'
import { formatDate } from '@/lib/dateUtils'
import type { SplitExpense, SplitHistoryResponse, SplitSettlement } from '@/types/split'
import {
  splitSectionCardClass,
} from '@/components/split/splitUiClasses'
import { getParticipantInitials } from '@/components/split/splitParticipantUtils'

type SplitHistoryViewProps = {
  history: SplitHistoryResponse
  participantCount?: number
  groupByCategory?: boolean
}

function formatShareLabel(shareCount: number, participantCount: number): string {
  if (participantCount <= 0) return `${shareCount} Personen`
  if (shareCount >= participantCount) return 'Alle'
  if (shareCount === 1) return '1 Person'
  return `${shareCount} Personen`
}

function SettlementRow({ settlement }: { settlement: SplitSettlement }) {
  const fromName = settlement.fromParticipant?.displayName ?? '?'
  const toName = settlement.toParticipant?.displayName ?? '?'

  return (
    <li className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-surface-muted sm:flex-row sm:items-center sm:gap-4">
      <div className="w-full sm:w-28 shrink-0">
        <p className="text-sm tabular-nums text-secondary">{formatDate(settlement.settledAt)}</p>
      </div>

      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-accent-border bg-accent-subtle text-[11px] font-semibold text-accent"
          aria-hidden="true"
        >
          {getParticipantInitials(fromName) || '?'}
        </span>
        <span className="font-medium text-primary">{fromName}</span>
        <ArrowLongRightIcon className="h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
        <span
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-accent-border bg-accent-subtle text-[11px] font-semibold text-accent"
          aria-hidden="true"
        >
          {getParticipantInitials(toName) || '?'}
        </span>
        <span className="font-medium text-primary">{toName}</span>
      </div>

      <div className="flex flex-col items-start gap-0.5 sm:items-end sm:shrink-0">
        <span className="text-sm font-semibold tabular-nums text-expense">
          {formatCurrency(-settlement.amount)}
        </span>
        {settlement.note && (
          <span className="max-w-xs text-xs text-secondary">{settlement.note}</span>
        )}
      </div>
    </li>
  )
}

function ExpenseHistoryRow({
  expense,
  participantCount,
}: {
  expense: SplitExpense
  participantCount: number
}) {
  const payerName = expense.paidBy?.displayName ?? '?'

  return (
    <li className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-surface-muted sm:flex-row sm:items-center sm:gap-4">
      <div className="w-full sm:w-28 shrink-0">
        <p className="text-sm tabular-nums text-secondary">{formatDate(expense.date)}</p>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-primary">{expense.description}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-secondary">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface-muted text-[10px] font-semibold text-primary"
              aria-hidden="true"
            >
              {getParticipantInitials(payerName) || '?'}
            </span>
            Bezahlt von {payerName}
          </span>
          <span aria-hidden="true">·</span>
          <span>{formatShareLabel(expense.shareParticipantIds.length, participantCount)}</span>
        </div>
      </div>

      <span className="text-sm font-medium tabular-nums text-expense sm:min-w-[5.5rem] sm:text-right sm:shrink-0">
        {formatCurrency(-expense.amount)}
      </span>
    </li>
  )
}

type CategoryGroup = {
  categoryId: string | null
  categoryName: string
  total: number
  color: string | null
  expenses: SplitExpense[]
}

export default function SplitHistoryView({
  history,
  participantCount = 0,
  groupByCategory = true,
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
      <div className="rounded-lg border border-border bg-surface px-4 py-10 text-center text-sm text-secondary">
        Noch keine Historie — Ausgaben und Ausgleiche erscheinen hier, sobald sie erfasst werden.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className={`${splitSectionCardClass} flex flex-wrap items-center justify-between gap-4`}>
        <div>
          <p className="text-sm font-medium text-primary">Historie</p>
          <p className="text-xs text-secondary">
            {history.expenses.length}{' '}
            {history.expenses.length === 1 ? 'Ausgabe' : 'Ausgaben'}
            {history.settlements.length > 0 &&
              ` · ${history.settlements.length} ${
                history.settlements.length === 1 ? 'Ausgleich' : 'Ausgleiche'
              }`}
            {expensesByCategory.length > 0 &&
              ` · ${expensesByCategory.length} ${
                expensesByCategory.length === 1 ? 'Kategorie' : 'Kategorien'
              }`}
          </p>
        </div>
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <div>
            <dt className="text-xs text-secondary">Gesamtausgaben</dt>
            <dd className="font-semibold tabular-nums text-expense">
              {formatCurrency(-history.totalExpenses)}
            </dd>
          </div>
          {history.settlements.length > 0 && (
            <div>
              <dt className="text-xs text-secondary">Ausgeglichen</dt>
              <dd className="font-semibold tabular-nums text-income">
                {formatCurrency(-totalSettled)}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <section className={`${splitSectionCardClass} overflow-hidden p-0`}>
        <header className="flex items-start gap-3 border-b border-accent-border bg-accent-subtle px-4 py-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-accent-border bg-surface text-accent">
            <BanknotesIcon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-base font-medium text-primary">Ausgleichszahlungen</h3>
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
          <ul className="divide-y divide-border bg-canvas">
            {history.settlements.map((settlement) => (
              <SettlementRow key={settlement.id} settlement={settlement} />
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-accent-border bg-accent-subtle text-accent">
            <ReceiptPercentIcon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-base font-medium text-primary">Ausgaben nach Kategorie</h3>
            <p className="text-xs text-secondary">
              Chronologisch sortiert, gruppiert nach Kategorie
            </p>
          </div>
        </div>

        {history.expenses.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface px-4 py-6 text-center text-sm text-secondary">
            Noch keine Ausgaben in der Historie.
          </div>
        ) : (
          <div className="space-y-4">
            {expensesByCategory.map((group) => (
              <section
                key={group.categoryName}
                className={`${splitSectionCardClass} overflow-hidden p-0`}
              >
                <header
                  className="flex items-center justify-between gap-3 border-b border-border px-4 py-3"
                  style={
                    group.color
                      ? { borderLeftWidth: 4, borderLeftColor: group.color }
                      : { borderLeftWidth: 4, borderLeftColor: 'var(--color-border)' }
                  }
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {group.color && (
                      <span
                        className="inline-flex h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: group.color }}
                        aria-hidden="true"
                      />
                    )}
                    <div>
                      <h4 className="truncate text-sm font-medium text-primary">
                        {group.categoryName}
                      </h4>
                      <p className="text-xs text-secondary">
                        {group.expenses.length}{' '}
                        {group.expenses.length === 1 ? 'Posten' : 'Posten'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-secondary">Summe</p>
                    <p className="text-base font-semibold tabular-nums text-expense">
                      {formatCurrency(-group.total)}
                    </p>
                  </div>
                </header>

                <ul className="divide-y divide-border bg-canvas">
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
