'use client'

import { formatCurrency } from '@/lib/formatters'
import { formatDate } from '@/lib/dateUtils'
import { getContrastColor } from '@/lib/colorUtils'
import type { SplitHistoryResponse } from '@/types/split'

type SplitHistoryViewProps = {
  history: SplitHistoryResponse
  groupByCategory?: boolean
}

export default function SplitHistoryView({
  history,
  groupByCategory = true,
}: SplitHistoryViewProps) {
  const expensesByCategory = groupByCategory
    ? history.categoryTotals.map((group) => ({
        ...group,
        expenses: history.expenses.filter((e) =>
          group.categoryId == null ? e.categoryId == null : e.categoryId === group.categoryId
        ),
      }))
    : [
        {
          categoryId: null,
          categoryName: 'Alle Ausgaben',
          total: history.totalExpenses,
          expenses: history.expenses,
        },
      ]

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-lg font-medium text-primary mb-4">Ausgleichszahlungen</h3>
        {history.settlements.length === 0 ? (
          <p className="text-sm text-secondary">Noch keine Ausgleiche erfasst.</p>
        ) : (
          <ul className="space-y-2">
            {history.settlements.map((s) => (
              <li key={s.id} className="rounded-control border border-border bg-surface px-4 py-3">
                <p className="text-sm text-primary">
                  <span className="font-medium">{s.fromParticipant?.displayName ?? '?'}</span>
                  {' → '}
                  <span className="font-medium">{s.toParticipant?.displayName ?? '?'}</span>
                  {' · '}
                  <span className="font-semibold tabular-nums text-expense">
                    {formatCurrency(-s.amount)}
                  </span>
                  <span className="ml-2 text-xs text-secondary">{formatDate(s.settledAt)}</span>
                </p>
                {s.note && <p className="mt-1 text-xs text-secondary">{s.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-baseline justify-between gap-2 border-b border-border pb-3">
          <h3 className="text-lg font-medium text-primary">Gesamtausgaben</h3>
          <p className="text-lg font-semibold tabular-nums text-expense">
            {formatCurrency(-history.totalExpenses)}
          </p>
        </div>

        {expensesByCategory.map((group) => (
          <div key={group.categoryName} className="mb-8 last:mb-0">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h4 className="text-sm font-medium text-secondary">{group.categoryName}</h4>
              <span className="text-sm tabular-nums text-secondary">
                {formatCurrency(-group.total)}
              </span>
            </div>
            <ul className="space-y-2">
              {group.expenses.map((e) => (
                <li
                  key={e.id}
                  className="flex flex-col gap-2 rounded-control border border-border bg-canvas px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-primary">{e.description}</p>
                    <p className="text-xs text-secondary mt-0.5">
                      {formatDate(e.date)} · bezahlt von {e.paidBy?.displayName ?? '?'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {e.category && (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: e.category.color ?? '#A7C7E7',
                          color: getContrastColor(e.category.color ?? '#A7C7E7'),
                        }}
                      >
                        {e.category.name}
                      </span>
                    )}
                    <span className="font-medium tabular-nums text-expense">
                      {formatCurrency(-e.amount)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  )
}
