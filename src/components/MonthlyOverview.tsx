import { formatCurrency } from '@/lib/formatters'

interface MonthlyOverviewProps {
  currentIncome: number
  currentExpenses: number
  totalIncome: number
  totalExpenses: number
  totalPendingExpenses: number
  available: number
}

export default function MonthlyOverview({
  currentIncome,
  currentExpenses,
  totalIncome,
  totalExpenses,
  totalPendingExpenses,
  available
}: MonthlyOverviewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="p-1.5 bg-green-200 rounded-lg">
                <svg className="w-4 h-4 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-green-800">Einnahmen</h3>
              <p className="text-xs text-green-600">Aktueller Monat</p>
            </div>
          </div>
          <p className="text-lg font-bold text-green-700">
            {formatCurrency(currentIncome)}
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="p-1.5 bg-red-200 rounded-lg">
                <svg className="w-4 h-4 text-red-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-red-800">Ausgaben</h3>
              <p className="text-xs text-red-600">Aktueller Monat</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-red-700">
              {formatCurrency(currentExpenses)}
            </p>
            {totalPendingExpenses > 0 && (
              <p className="text-xs text-red-600">
                Nicht bestätigt: {formatCurrency(totalPendingExpenses)}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="p-1.5 bg-blue-200 rounded-lg">
                <svg className="w-4 h-4 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-blue-800">Verfügbar</h3>
              <p className="text-xs text-blue-600">Inkl. nicht bestätigt</p>
            </div>
          </div>
          <p className="text-lg font-bold text-blue-700">
            {formatCurrency(available)}
          </p>
        </div>
      </div>
    </div>
  )
} 