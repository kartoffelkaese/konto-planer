'use client'

import { useMemo } from 'react'
import { PencilIcon, TrashIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import { formatDate } from '@/lib/dateUtils'
import { formatCurrency } from '@/lib/formatters'
import { getContrastColor } from '@/lib/colorUtils'
import { Button } from '@/components/Button'
import EmptyState from '@/components/EmptyState'
import type { SplitExpense, SplitParticipant } from '@/types/split'
import { splitSectionCardClass } from '@/components/split/splitUiClasses'

type SplitExpenseListProps = {
  expenses: SplitExpense[]
  participants: SplitParticipant[]
  readOnly?: boolean
  onEdit?: (expense: SplitExpense) => void
  onDelete?: (expenseId: string) => void
  onAdd?: () => void
}

type ParticipantExpensePanelProps = {
  participant: SplitParticipant
  expenses: SplitExpense[]
  participantCount: number
  readOnly?: boolean
  onEdit?: (expense: SplitExpense) => void
  onDelete?: (expenseId: string) => void
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function formatShareLabel(shareCount: number, participantCount: number): string {
  if (shareCount >= participantCount) return 'Alle'
  if (shareCount === 1) return '1 Person'
  return `${shareCount} Personen`
}

function ParticipantExpensePanel({
  participant,
  expenses,
  participantCount,
  readOnly = false,
  onEdit,
  onDelete,
}: ParticipantExpensePanelProps) {
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const initials = getInitials(participant.displayName)

  return (
    <section className={`${splitSectionCardClass} overflow-hidden p-0`}>
      <header className="flex items-center gap-3 border-b border-accent-border bg-accent-subtle px-4 py-3">
        <span
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent-border bg-surface text-sm font-semibold text-accent"
          aria-hidden="true"
        >
          {initials || '?'}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-medium text-primary">
            {participant.displayName}
          </h3>
          <p className="text-xs text-secondary">
            {expenses.length === 1 ? '1 Ausgabe' : `${expenses.length} Ausgaben`}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-secondary">Bezahlt</p>
          <p className="text-lg font-semibold tabular-nums text-expense">
            {formatCurrency(-total)}
          </p>
        </div>
      </header>

      <ul className="divide-y divide-border bg-canvas">
        {expenses.map((expense) => (
          <li
            key={expense.id}
            className="group flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-surface-muted sm:flex-row sm:items-center sm:gap-4"
          >
            <div className="w-full sm:w-24 shrink-0">
              <p className="text-sm tabular-nums text-secondary">{formatDate(expense.date)}</p>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-primary">{expense.description}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {expense.category && (
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{
                      backgroundColor: expense.category.color ?? '#A7C7E7',
                      color: getContrastColor(expense.category.color ?? '#A7C7E7'),
                    }}
                  >
                    {expense.category.name}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-xs text-secondary">
                  <UserGroupIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  {formatShareLabel(expense.shareParticipantIds.length, participantCount)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 sm:justify-end sm:shrink-0">
              <span className="text-sm font-medium tabular-nums text-expense sm:min-w-[5.5rem] sm:text-right">
                {formatCurrency(-expense.amount)}
              </span>
              {!readOnly && (
                <div className="flex gap-0.5 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => onEdit?.(expense)}
                    aria-label={`${expense.description} bearbeiten`}
                  >
                    <PencilIcon className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete?.(expense.id)}
                    aria-label={`${expense.description} löschen`}
                  >
                    <TrashIcon className="h-4 w-4 text-expense" aria-hidden="true" />
                  </Button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function SplitExpenseList({
  expenses,
  participants,
  readOnly = false,
  onEdit,
  onDelete,
  onAdd,
}: SplitExpenseListProps) {
  const expensesByParticipant = useMemo(() => {
    const map = new Map<string, SplitExpense[]>()
    for (const participant of participants) {
      map.set(participant.id, [])
    }
    for (const expense of expenses) {
      const list = map.get(expense.paidByParticipantId)
      if (list) {
        list.push(expense)
      }
    }
    for (const [, list] of map) {
      list.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )
    }
    return map
  }, [expenses, participants])

  const participantsWithExpenses = useMemo(() => {
    return [...participants]
      .filter((participant) => (expensesByParticipant.get(participant.id)?.length ?? 0) > 0)
      .sort((a, b) => {
        const totalA = (expensesByParticipant.get(a.id) ?? []).reduce(
          (sum, expense) => sum + expense.amount,
          0
        )
        const totalB = (expensesByParticipant.get(b.id) ?? []).reduce(
          (sum, expense) => sum + expense.amount,
          0
        )
        if (totalB !== totalA) return totalB - totalA
        const orderA = a.sortOrder ?? 0
        const orderB = b.sortOrder ?? 0
        if (orderA !== orderB) return orderA - orderB
        return a.displayName.localeCompare(b.displayName, 'de')
      })
  }, [participants, expensesByParticipant])

  const participantsWithoutExpenses = useMemo(() => {
    return participants.filter(
      (participant) => (expensesByParticipant.get(participant.id)?.length ?? 0) === 0
    )
  }, [participants, expensesByParticipant])

  const totalAmount = useMemo(
    () => expenses.reduce((sum, expense) => sum + expense.amount, 0),
    [expenses]
  )

  if (expenses.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface overflow-hidden">
        <EmptyState
          title="Noch keine Ausgaben erfasst"
          description="Erfassen Sie gemeinsame Kosten — die App rechnet automatisch aus, wer wem was schuldet."
          actionLabel={!readOnly && onAdd ? 'Erste Ausgabe hinzufügen' : undefined}
          onAction={onAdd}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3">
        <div>
          <p className="text-sm font-medium text-primary">Ausgabenübersicht</p>
          <p className="text-xs text-secondary">
            Gruppiert nach „Bezahlt von“ · {participantsWithExpenses.length}{' '}
            {participantsWithExpenses.length === 1 ? 'Person' : 'Personen'} mit Posten
          </p>
        </div>
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <div>
            <dt className="text-xs text-secondary">Posten</dt>
            <dd className="font-medium tabular-nums text-primary">{expenses.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-secondary">Gesamt</dt>
            <dd className="font-semibold tabular-nums text-expense">
              {formatCurrency(-totalAmount)}
            </dd>
          </div>
        </dl>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {participantsWithExpenses.map((participant) => (
          <ParticipantExpensePanel
            key={participant.id}
            participant={participant}
            expenses={expensesByParticipant.get(participant.id) ?? []}
            participantCount={participants.length}
            readOnly={readOnly}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>

      {participantsWithoutExpenses.length > 0 && (
        <p className="text-sm text-secondary text-center px-2">
          {participantsWithoutExpenses.length === 1
            ? `${participantsWithoutExpenses[0].displayName} hat noch keine Ausgaben bezahlt.`
            : `${participantsWithoutExpenses.map((participant) => participant.displayName).join(', ')} haben noch keine Ausgaben bezahlt.`}
        </p>
      )}
    </div>
  )
}
