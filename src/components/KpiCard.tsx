import type { ComponentType, SVGProps } from 'react'
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  ClockIcon,
  ScaleIcon,
} from '@heroicons/react/24/outline'
import { formatCurrency } from '@/lib/formatters'

type StripeVariant = 'accent' | 'income' | 'expense' | 'pending'

const badgeClasses: Record<StripeVariant, string> = {
  accent: 'bg-accent-subtle text-accent',
  income: 'bg-income-bg text-income',
  expense: 'bg-expense-bg text-expense',
  pending: 'bg-pending-bg text-pending',
}

const valueClasses: Record<StripeVariant, string> = {
  accent: 'text-primary',
  income: 'text-income',
  expense: 'text-expense',
  pending: 'text-pending',
}

const icons: Record<StripeVariant, ComponentType<SVGProps<SVGSVGElement>>> = {
  accent: ScaleIcon,
  income: ArrowDownLeftIcon,
  expense: ArrowUpRightIcon,
  pending: ClockIcon,
}

interface KpiCardProps {
  label: string
  amount: number
  subtitle?: string
  /** Semantische Variante (Name historisch: früher farbiger Randstreifen) */
  stripe?: StripeVariant
  signed?: boolean
}

export default function KpiCard({
  label,
  amount,
  subtitle,
  stripe = 'accent',
  signed = false,
}: KpiCardProps) {
  const Icon = icons[stripe]

  return (
    <div className="card min-w-0 p-4 sm:p-5">
      <div className="flex items-center gap-2.5 sm:gap-3">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full sm:h-9 sm:w-9 ${badgeClasses[stripe]}`}
          aria-hidden="true"
        >
          <Icon className="h-[1.125rem] w-[1.125rem]" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-primary truncate">{label}</h3>
          {subtitle && <p className="eyebrow truncate">{subtitle}</p>}
        </div>
      </div>
      <p
        className={`amount-lg mt-3 text-[clamp(1.125rem,5vw,1.5rem)] sm:mt-4 ${valueClasses[stripe]}`}
      >
        {signed && amount > 0 ? '+' : ''}
        {formatCurrency(amount)}
      </p>
    </div>
  )
}
