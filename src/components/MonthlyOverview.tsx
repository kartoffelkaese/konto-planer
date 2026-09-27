import { useState } from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { formatCurrency } from '@/lib/formatters'
import KpiCard from '@/components/KpiCard'

interface MonthlyOverviewProps {
  currentIncome: number
  currentExpenses: number
  clearedBalance: number
  totalPendingExpenses: number
  available: number
  hidePendingMetrics?: boolean
  incomeSubtitle?: string
  balanceSubtitle?: string
}

export default function MonthlyOverview({
  currentIncome,
  currentExpenses,
  clearedBalance,
  totalPendingExpenses,
  available,
  hidePendingMetrics = false,
  incomeSubtitle = 'Aktueller Monat',
  balanceSubtitle,
}: MonthlyOverviewProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const kpiItems = (
    <>
      <KpiCard label="Einnahmen" subtitle={incomeSubtitle} amount={currentIncome} stripe="income" />
      {!hidePendingMetrics && (
        <KpiCard label="Ausgaben" subtitle={incomeSubtitle} amount={currentExpenses} stripe="expense" />
      )}
      <KpiCard
        label="Kontostand"
        subtitle={balanceSubtitle}
        amount={clearedBalance}
        stripe="accent"
      />
      {!hidePendingMetrics && (
        <>
          <KpiCard label="Ausstehend" amount={totalPendingExpenses} stripe="pending" />
          <KpiCard label="Verfügbar" subtitle="Inkl. nicht bestätigt" amount={available} stripe="accent" />
        </>
      )}
    </>
  )

  return (
    <div className="space-y-4">
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          className="hero-card w-full p-5 flex items-center justify-between gap-3 text-left active:!scale-100"
        >
          <div className="min-w-0 flex-1">
            <p className="eyebrow">Verfügbar</p>
            <p
              className={`amount-lg mt-1 ${available < 0 ? 'text-expense' : 'text-primary'}`}
            >
              {formatCurrency(available)}
            </p>
            <p className="text-xs text-secondary mt-1">
              Kontostand {formatCurrency(clearedBalance)}
            </p>
          </div>
          <ChevronDownIcon
            aria-hidden="true"
            className={`h-5 w-5 shrink-0 text-secondary transition-transform duration-expand ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </button>

        <div
          className={`grid transition-[grid-template-rows] duration-expand ease-out ${
            isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
        >
          <div className="overflow-hidden">
            <div
              className={`mt-3 grid grid-cols-2 gap-3 transition-opacity duration-expand ${
                isExpanded ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <KpiCard label="Einnahmen" subtitle={incomeSubtitle} amount={currentIncome} stripe="income" />
              {!hidePendingMetrics && (
                <KpiCard label="Ausgaben" subtitle={incomeSubtitle} amount={currentExpenses} stripe="expense" />
              )}
              {!hidePendingMetrics && (
                <>
                  <KpiCard label="Ausstehend" amount={totalPendingExpenses} stripe="pending" />
                  <KpiCard label="Verfügbar" subtitle="Inkl. nicht bestätigt" amount={available} stripe="accent" />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={`hidden md:grid md:gap-4 lg:hidden ${hidePendingMetrics ? 'md:grid-cols-2' : 'md:grid-cols-2'}`}>
        {kpiItems}
      </div>

      <div className={`hidden lg:grid lg:gap-4 ${hidePendingMetrics ? 'lg:grid-cols-2' : 'lg:grid-cols-2 xl:grid-cols-5'}`}>
        {kpiItems}
      </div>
    </div>
  )
}
