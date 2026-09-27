import type { Transaction } from '@/types'

export default function TransferBadge({
  transaction,
  className = 'ml-2',
}: {
  transaction: Transaction
  className?: string
}) {
  if (transaction.isTransfer && transaction.transferTargetAccount) {
    return (
      <span className={`inline-flex min-w-0 max-w-full items-center rounded-full bg-accent-subtle px-2 py-0.5 text-xs text-accent ${className}`}>
        <span className="truncate">→ {transaction.transferTargetAccount.name}</span>
      </span>
    )
  }

  const sourceAccount = transaction.transferPairAsTarget?.sourceTransaction?.account
  if (sourceAccount) {
    return (
      <span className={`inline-flex min-w-0 max-w-full items-center rounded-full bg-accent-subtle px-2 py-0.5 text-xs text-accent ${className}`}>
        <span className="truncate">← {sourceAccount.name}</span>
      </span>
    )
  }

  return null
}
