'use client'

interface TransferTarget {
  id: string
  name: string
  role: string
}

interface TransferAccountFieldsProps {
  transferTargets: TransferTarget[]
  isTransfer: boolean
  transferTargetAccountId: string
  onIsTransferChange: (value: boolean) => void
  onTargetChange: (accountId: string) => void
  disabled?: boolean
  idPrefix?: string
}

export default function TransferAccountFields({
  transferTargets,
  isTransfer,
  transferTargetAccountId,
  onIsTransferChange,
  onTargetChange,
  disabled = false,
  idPrefix = 'transfer',
}: TransferAccountFieldsProps) {
  if (transferTargets.length === 0) return null

  return (
    <>
      <div className="flex items-center">
        <input
          type="checkbox"
          id={`${idPrefix}-isTransfer`}
          checked={isTransfer}
          onChange={(e) => onIsTransferChange(e.target.checked)}
          className="h-4 w-4 text-accent focus:ring-accent border-border bg-surface rounded"
          disabled={disabled}
        />
        <label htmlFor={`${idPrefix}-isTransfer`} className="ml-2 block text-sm text-primary">
          Umbuchung auf anderes Konto
        </label>
      </div>

      {isTransfer && (
        <div>
          <label
            htmlFor={`${idPrefix}-targetAccount`}
            className="block text-sm font-medium text-primary"
          >
            Zielkonto
          </label>
          <select
            id={`${idPrefix}-targetAccount`}
            value={transferTargetAccountId}
            onChange={(e) => onTargetChange(e.target.value)}
            className="mt-1 block w-full rounded-control border-border bg-surface shadow-sm focus:ring-accent sm:text-sm"
            required
            disabled={disabled}
          >
            <option value="">Konto wählen…</option>
            {transferTargets.map((target) => (
              <option key={target.id} value={target.id}>
                {target.name}
                {target.role === 'MEMBER' ? ' (geteilt)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}
    </>
  )
}

export type { TransferTarget }
