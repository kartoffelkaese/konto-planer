import Link from 'next/link'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import EmptyState from '@/components/EmptyState'
import TransactionAvatar from '@/components/TransactionAvatar'
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
    <section className="card p-5 md:p-6">
      <div className="flex items-center justify-between gap-4 mb-3">
        <h2 className="text-base font-semibold text-primary">Letzte Buchungen</h2>
        <Link
          href="/transactions"
          className="inline-flex min-h-11 items-center gap-1 rounded-pill px-3 -mr-3 text-sm font-medium text-accent hover:bg-accent-subtle"
        >
          Alle
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
        <ul className="-mx-2">
          {transactions.map((transaction) => {
            const name = resolveTransactionMerchantName(transaction)
            return (
              <li key={transaction.id}>
                <Link
                  href={`/transactions?edit=${transaction.id}`}
                  className="flex items-center gap-3 rounded-control px-2 py-2.5 transition-colors hover:bg-surface-muted"
                >
                  <TransactionAvatar name={name} amount={transaction.amount} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-primary truncate">{name}</p>
                    <p className="text-sm text-secondary truncate">
                      {formatDate(new Date(transaction.date))}
                      {transaction.description && ` · ${transaction.description}`}
                    </p>
                  </div>
                  <p
                    className={`amount shrink-0 ${
                      transaction.amount >= 0 ? 'text-income' : 'text-primary'
                    }`}
                  >
                    {transaction.amount > 0 ? '+' : ''}
                    {formatCurrency(transaction.amount)}
                  </p>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
