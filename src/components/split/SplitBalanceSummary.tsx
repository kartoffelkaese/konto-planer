'use client'

import { useMemo } from 'react'
import { formatCurrency } from '@/lib/formatters'
import type { SplitBalanceEntry } from '@/types/split'
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
  creditor: 'bg-income-bg text-income',
  debtor: 'bg-expense-bg text-expense',
  settled: 'bg-surface-muted text-secondary',
}

const statusAvatarClass: Record<BalanceStatus, string> = {
  creditor: 'bg-income-bg text-income',
  debtor: 'bg-expense-bg text-expense',
  settled: 'bg-surface-muted text-secondary',
}

function BalanceParticipantRow({ entry, totalExpenses }: { entry: SplitBalanceEntry; totalExpenses: number }) {
  const status = getBalanceStatus(entry.net)
  const paidShare = totalExpenses > 0 ? Math.min(100, (entry.paid / totalExpenses) * 100) : 0
  const owedShare = totalExpenses > 0 ? Math.min(100, (entry.owed / totalExpenses) * 100) : 0

  return (
    <li className="rounded-control px-2 py-3 transition-colors hover:bg-surface-muted/60">
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${statusAvatarClass[status]}`}
          aria-hidden="true"
        >
          {getParticipantInitials(entry.displayName) || '?'}
        </span>

        <div className="min-w-0 flex-1">
          <h4 className="truncate font-medium text-primary">{entry.displayName}</h4>
          <p className="text-sm text-secondary tabular-nums truncate">
            Bezahlt {formatCurrency(entry.paid)} · Anteil {formatCurrency(entry.owed)}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p
            className={`amount ${
              status === 'creditor'
                ? 'text-income'
                : status === 'debtor'
                  ? 'text-expense'
                  : 'text-secondary'
            }`}
          >
            {status === 'creditor' && '+'}
            {formatCurrency(entry.net)}
          </p>
          <span
            className={`mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass[status]}`}
          >
            {getBalanceStatusLabel(status)}
          </span>
        </div>
      </div>

      {totalExpenses > 0 && (
        <div className="mt-2.5 pl-[3.25rem]">
          <div
            className="flex h-1.5 overflow-hidden rounded-full bg-surface-muted"
            title={`${Math.round(paidShare)} % bezahlt · ${Math.round(owedShare)} % Anteil am Gesamtbetrag`}
          >
            <span className="rounded-full bg-accent" style={{ width: `${paidShare}%` }} />
            <span
              className="bg-border/60"
              style={{ width: `${Math.max(0, owedShare - paidShare)}%` }}
            />
          </div>
          <p className="sr-only">
            {Math.round(paidShare)} % bezahlt, {Math.round(owedShare)} % Anteil am Gesamtbetrag
          </p>
        </div>
      )}
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
    <section className="card p-4 md:p-5">
      <h3 className="mb-1 text-base font-semibold text-primary">{title}</h3>
      <ul className="-mx-2">
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
      <section className="hero-card p-6 md:p-8">
        <p className="eyebrow">Gesamtausgaben</p>
        <p className="amount-hero mt-2 text-primary">{formatCurrency(totalExpenses)}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="chip">
            {balances.length} Teilnehmer
          </span>
          {openSettlements > 0 ? (
            <span className="chip">
              <span className="h-2 w-2 rounded-full bg-pending" aria-hidden="true" />
              {openSettlements} {openSettlements === 1 ? 'offener Ausgleich' : 'offene Ausgleiche'}
            </span>
          ) : (
            <span className="chip">
              <span className="h-2 w-2 rounded-full bg-income" aria-hidden="true" />
              Alle Salden ausgeglichen
            </span>
          )}
          {creditorCount > 0 && (
            <span className="chip">
              <span className="text-income font-semibold">{creditorCount}</span> bekommen zurück
            </span>
          )}
          {debtorCount > 0 && (
            <span className="chip">
              <span className="text-expense font-semibold">{debtorCount}</span> schulden noch
            </span>
          )}
        </div>
      </section>

      {totalExpenses === 0 ? (
        <div className="card px-4 py-8 text-center text-sm text-secondary">
          Noch keine Ausgaben erfasst — Salden erscheinen, sobald Kosten eingetragen werden.
        </div>
      ) : (
        <div className="space-y-4">
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
