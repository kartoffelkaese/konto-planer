'use client'

import { useMemo } from 'react'
import { formatCurrency } from '@/lib/formatters'
import type { SplitBalanceEntry } from '@/types/split'
import { splitSectionCardClass } from '@/components/split/splitUiClasses'
import {
  getBalanceStatus,
  getBalanceStatusLabel,
  getParticipantInitials,
  type BalanceStatus,
} from '@/components/split/splitParticipantUtils'

type SplitBalanceSummaryProps = {
  balances: SplitBalanceEntry[]
  totalExpenses: number
  openSettlements?: number
}

const statusBadgeClass: Record<BalanceStatus, string> = {
  creditor: 'border-income/30 bg-income-bg text-income',
  debtor: 'border-expense/30 bg-expense-bg text-expense',
  settled: 'border-border bg-surface-muted text-secondary',
}

const statusStripeClass: Record<BalanceStatus, string> = {
  creditor: 'border-l-income',
  debtor: 'border-l-expense',
  settled: 'border-l-border',
}

function BalanceParticipantRow({ entry, totalExpenses }: { entry: SplitBalanceEntry; totalExpenses: number }) {
  const status = getBalanceStatus(entry.net)
  const paidShare = totalExpenses > 0 ? Math.min(100, (entry.paid / totalExpenses) * 100) : 0
  const owedShare = totalExpenses > 0 ? Math.min(100, (entry.owed / totalExpenses) * 100) : 0

  return (
    <li
      className={`rounded-lg border border-border border-l-4 bg-surface ${statusStripeClass[status]} overflow-hidden`}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <span
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent-border bg-accent-subtle text-sm font-semibold text-accent"
          aria-hidden="true"
        >
          {getParticipantInitials(entry.displayName) || '?'}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate text-sm font-medium text-primary">{entry.displayName}</h4>
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusBadgeClass[status]}`}
            >
              {getBalanceStatusLabel(status)}
            </span>
          </div>

          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
            <div>
              <dt className="text-secondary">Bezahlt</dt>
              <dd className="font-medium tabular-nums text-primary">{formatCurrency(-entry.paid)}</dd>
            </div>
            <div>
              <dt className="text-secondary">Anteil</dt>
              <dd className="font-medium tabular-nums text-primary">{formatCurrency(-entry.owed)}</dd>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <dt className="text-secondary">Saldo</dt>
              <dd
                className={`font-semibold tabular-nums ${
                  status === 'creditor'
                    ? 'text-income'
                    : status === 'debtor'
                      ? 'text-expense'
                      : 'text-secondary'
                }`}
              >
                {status === 'creditor' && '+'}
                {formatCurrency(entry.net)}
              </dd>
            </div>
          </dl>

          {totalExpenses > 0 && (
            <div className="mt-3 space-y-1">
              <div className="flex h-1.5 overflow-hidden rounded-full bg-surface-muted">
                <span
                  className="bg-accent/70"
                  style={{ width: `${paidShare}%` }}
                  title={`Bezahlt: ${Math.round(paidShare)} % der Gesamtausgaben`}
                />
                <span
                  className="bg-border"
                  style={{ width: `${Math.max(0, owedShare - paidShare)}%` }}
                  title={`Anteil über Bezahlt: ${Math.round(Math.max(0, owedShare - paidShare))} %`}
                />
              </div>
              <p className="text-[11px] text-secondary">
                {Math.round(paidShare)} % bezahlt · {Math.round(owedShare)} % Anteil am Gesamtbetrag
              </p>
            </div>
          )}
        </div>
      </div>
    </li>
  )
}

function BalanceSection({
  title,
  entries,
  totalExpenses,
}: {
  title: string
  entries: SplitBalanceEntry[]
  totalExpenses: number
}) {
  if (entries.length === 0) return null

  return (
    <section>
      <h3 className="mb-3 text-sm font-medium text-secondary">{title}</h3>
      <ul className="space-y-3">
        {entries.map((entry) => (
          <BalanceParticipantRow
            key={entry.participantId}
            entry={entry}
            totalExpenses={totalExpenses}
          />
        ))}
      </ul>
    </section>
  )
}

export default function SplitBalanceSummary({
  balances,
  totalExpenses,
  openSettlements = 0,
}: SplitBalanceSummaryProps) {
  const grouped = useMemo(() => {
    const creditors: SplitBalanceEntry[] = []
    const debtors: SplitBalanceEntry[] = []
    const settled: SplitBalanceEntry[] = []

    for (const entry of balances) {
      const status = getBalanceStatus(entry.net)
      if (status === 'creditor') creditors.push(entry)
      else if (status === 'debtor') debtors.push(entry)
      else settled.push(entry)
    }

    creditors.sort((a, b) => b.net - a.net)
    debtors.sort((a, b) => a.net - b.net)
    settled.sort((a, b) => a.displayName.localeCompare(b.displayName, 'de'))

    return { creditors, debtors, settled }
  }, [balances])

  const creditorCount = grouped.creditors.length
  const debtorCount = grouped.debtors.length

  return (
    <div className="space-y-4">
      <div className={`${splitSectionCardClass} flex flex-wrap items-center justify-between gap-4`}>
        <div>
          <p className="text-sm font-medium text-primary">Saldenübersicht</p>
          <p className="text-xs text-secondary">
            {balances.length} {balances.length === 1 ? 'Teilnehmer' : 'Teilnehmer'}
            {openSettlements > 0
              ? ` · ${openSettlements} ${openSettlements === 1 ? 'offener Ausgleich' : 'offene Ausgleiche'}`
              : ' · alle Salden ausgeglichen'}
          </p>
        </div>
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <div>
            <dt className="text-xs text-secondary">Gesamtausgaben</dt>
            <dd className="font-semibold tabular-nums text-expense">
              {formatCurrency(-totalExpenses)}
            </dd>
          </div>
          {creditorCount > 0 && (
            <div>
              <dt className="text-xs text-secondary">Bekommen zurück</dt>
              <dd className="font-medium tabular-nums text-income">{creditorCount}</dd>
            </div>
          )}
          {debtorCount > 0 && (
            <div>
              <dt className="text-xs text-secondary">Schulden offen</dt>
              <dd className="font-medium tabular-nums text-expense">{debtorCount}</dd>
            </div>
          )}
        </dl>
      </div>

      {totalExpenses === 0 ? (
        <div className="rounded-lg border border-border bg-surface px-4 py-8 text-center text-sm text-secondary">
          Noch keine Ausgaben erfasst — Salden erscheinen, sobald Kosten eingetragen werden.
        </div>
      ) : (
        <div className="space-y-6">
          <BalanceSection
            title="Bekommt Geld zurück"
            entries={grouped.creditors}
            totalExpenses={totalExpenses}
          />
          <BalanceSection
            title="Schuldet noch"
            entries={grouped.debtors}
            totalExpenses={totalExpenses}
          />
          <BalanceSection
            title="Ausgeglichen"
            entries={grouped.settled}
            totalExpenses={totalExpenses}
          />
        </div>
      )}
    </div>
  )
}
