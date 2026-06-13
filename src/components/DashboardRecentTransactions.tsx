import Link from 'next/link'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import EmptyState from '@/components/EmptyState'
import { formatCurrency } from '@/lib/formatters'
import { formatDate } from '@/lib/dateUtils'
import { resolveTransactionMerchantName } from '@/lib/merchantCategories'

export type DashboardRecentTransaction = {
  id: string
  merchant: string
  amount: number
  date: string
  description: string | null
}

type DashboardRecentTransactionsProps = {
  transactions: DashboardRecentTransaction[]
}

export default function DashboardRecentTransactions({
  transactions,
}: DashboardRecentTransactionsProps) {
  return (
    <div className="bg-surface rounded-lg border border-border p-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="text-lg font-medium text-primary">Letzte Buchungen</h2>
        <Link
          href="/transactions"
          className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
        >
          Alle anzeigen
          <ArrowRightIcon className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      {transactions.length === 0 ? (
        <EmptyState
          title="Noch keine bestätigten Buchungen"
          description="Sobald Transaktionen gebucht sind, erscheinen sie hier."
          actionLabel="Transaktion erfassen"
          actionHref="/transactions?new=1"
        />
      ) : (
        <ul className="divide-y divide-border">
          {transactions.map((transaction) => (
            <li key={transaction.id}>
              <Link
                href={`/transactions?edit=${transaction.id}`}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0 rounded-control -mx-2 px-2 hover:bg-surface-muted/80 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium text-primary truncate">
                    {resolveTransactionMerchantName(transaction)}
                  </p>
                  <p className="text-sm text-secondary truncate">
                    {formatDate(new Date(transaction.date))}
                    {transaction.description && ` · ${transaction.description}`}
                  </p>
                </div>
                <p
                  className={`shrink-0 font-medium tabular-nums ${
                    transaction.amount >= 0 ? 'text-income' : 'text-expense'
                  }`}
                >
                  {formatCurrency(transaction.amount)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
