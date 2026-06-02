import type { Transaction } from '@/types'

export default function TransferBadge({ transaction }: { transaction: Transaction }) {
  if (transaction.isTransfer && transaction.transferTargetAccount) {
    return (
      <span className="ml-2 inline-flex items-center rounded-full bg-accent-subtle px-2 py-0.5 text-xs text-accent">
        → {transaction.transferTargetAccount.name}
      </span>
    )
  }

  const sourceAccount = transaction.transferPairAsTarget?.sourceTransaction?.account
  if (sourceAccount) {
    return (
      <span className="ml-2 inline-flex items-center rounded-full bg-accent-subtle px-2 py-0.5 text-xs text-accent">
        ← {sourceAccount.name}
      </span>
    )
  }

  return null
}
