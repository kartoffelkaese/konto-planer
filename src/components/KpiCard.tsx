import { formatCurrency } from '@/lib/formatters'

type StripeVariant = 'accent' | 'income' | 'expense' | 'pending'

const stripeClasses: Record<StripeVariant, string> = {
  accent: 'border-l-accent',
  income: 'border-l-income',
  expense: 'border-l-expense',
  pending: 'border-l-pending',
}

const valueClasses: Record<StripeVariant, string> = {
  accent: 'text-accent',
  income: 'text-income',
  expense: 'text-expense',
  pending: 'text-pending',
}

interface KpiCardProps {
  label: string
  amount: number
  subtitle?: string
  stripe?: StripeVariant
}

export default function KpiCard({
  label,
  amount,
  subtitle,
  stripe = 'accent',
}: KpiCardProps) {
  const isAccent = stripe === 'accent'

  return (
    <div
      className={`rounded-card border-l-4 p-4 ${stripeClasses[stripe]} ${
        isAccent
          ? 'kpi-card--accent bg-accent-subtle border border-accent'
          : 'bg-surface border border-border'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-secondary">{label}</h3>
          {subtitle && (
            <p className="text-xs text-secondary opacity-80 mt-0.5">{subtitle}</p>
          )}
        </div>
        <p className={`text-xl font-semibold tabular-nums shrink-0 ${valueClasses[stripe]}`}>
          {formatCurrency(amount)}
        </p>
      </div>
    </div>
  )
}
