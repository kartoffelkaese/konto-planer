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
}

export default function MonthlyOverview({
  currentIncome,
  clearedBalance,
  totalPendingExpenses,
  available,
  hidePendingMetrics = false,
}: MonthlyOverviewProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const kpiItems = (
    <>
      <KpiCard label="Einnahmen" subtitle="Aktueller Monat" amount={currentIncome} stripe="income" />
      <KpiCard label="Kontostand" amount={clearedBalance} stripe="accent" />
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
          className="w-full bg-accent-subtle border border-accent rounded-card border-l-4 border-l-accent p-4 flex items-center justify-between"
        >
          <div>
            <h3 className="text-sm font-medium text-secondary">Kontostand</h3>
            <p className="text-xl font-semibold tabular-nums text-accent mt-1">
              {formatCurrency(clearedBalance)}
            </p>
          </div>
          <ChevronDownIcon
            className={`h-5 w-5 text-accent transition-transform duration-expand ${
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
              className={`mt-4 space-y-4 transition-opacity duration-expand ${
                isExpanded ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <KpiCard label="Einnahmen" subtitle="Aktueller Monat" amount={currentIncome} stripe="income" />
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

      <div className={`hidden lg:grid lg:gap-4 ${hidePendingMetrics ? 'lg:grid-cols-2' : 'lg:grid-cols-4'}`}>
        {kpiItems}
      </div>
    </div>
  )
}
