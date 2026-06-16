'use client'

import KpiCard from '@/components/KpiCard'
import { formatCurrency } from '@/lib/formatters'
import type { SplitBalanceEntry } from '@/types/split'

type SplitBalanceSummaryProps = {
  balances: SplitBalanceEntry[]
  totalExpenses: number
}

export default function SplitBalanceSummary({
  balances,
  totalExpenses,
}: SplitBalanceSummaryProps) {
  return (
    <div className="space-y-4">
      <KpiCard
        label="Gesamtausgaben"
        subtitle="Summe aller erfassten Posten"
        amount={-totalExpenses}
        stripe="expense"
      />

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead>
              <tr className="border-b border-accent-border bg-accent-subtle">
                <th className="p-4 text-left text-sm font-medium text-secondary">Teilnehmer</th>
                <th className="p-4 text-right text-sm font-medium text-secondary">Bezahlt</th>
                <th className="p-4 text-right text-sm font-medium text-secondary">Anteil</th>
                <th className="p-4 text-right text-sm font-medium text-secondary">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-canvas">
              {balances.map((entry) => (
                <tr
                  key={entry.participantId}
                  className="transition-colors duration-100 hover:bg-surface-muted"
                >
                  <td className="px-6 py-4 text-sm text-primary">{entry.displayName}</td>
                  <td className="px-6 py-4 text-sm text-right tabular-nums text-secondary">
                    {formatCurrency(-entry.paid)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right tabular-nums text-secondary">
                    {formatCurrency(-entry.owed)}
                  </td>
                  <td
                    className={`px-6 py-4 text-sm text-right font-medium tabular-nums ${
                      entry.net > 0.005
                        ? 'text-income'
                        : entry.net < -0.005
                          ? 'text-expense'
                          : 'text-secondary'
                    }`}
                  >
                    {entry.net > 0.005 && '+'}
                    {formatCurrency(entry.net)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="md:hidden divide-y divide-border">
          {balances.map((entry) => (
            <li key={entry.participantId} className="p-4 space-y-1">
              <p className="font-medium text-primary">{entry.displayName}</p>
              <dl className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <dt className="text-secondary">Bezahlt</dt>
                  <dd className="tabular-nums text-primary">{formatCurrency(-entry.paid)}</dd>
                </div>
                <div>
                  <dt className="text-secondary">Anteil</dt>
                  <dd className="tabular-nums text-primary">{formatCurrency(-entry.owed)}</dd>
                </div>
                <div>
                  <dt className="text-secondary">Saldo</dt>
                  <dd
                    className={`tabular-nums font-medium ${
                      entry.net > 0.005
                        ? 'text-income'
                        : entry.net < -0.005
                          ? 'text-expense'
                          : 'text-secondary'
                    }`}
                  >
                    {formatCurrency(entry.net)}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
