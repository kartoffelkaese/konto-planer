import { Transaction } from '@/types'
import { isTransactionDueInSalaryMonth, getSalaryMonthRange } from '@/lib/dateUtils'
import { formatCurrency } from '@/lib/formatters'

interface MonthlyOverviewProps {
  currentIncome: number
  currentExpenses: number
  pendingExpenses: number
  available: number
}

export default function MonthlyOverview({
  currentIncome,
  currentExpenses,
  pendingExpenses,
  available
}: MonthlyOverviewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-sm font-medium text-gray-500">Einnahmen (aktueller Monat)</h3>
        <p className="mt-2 text-3xl font-semibold text-gray-900">
          {currentIncome.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-sm font-medium text-gray-500">Ausgaben (aktueller Monat)</h3>
        <p className="mt-2 text-3xl font-semibold text-gray-900">
          {currentExpenses.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-sm font-medium text-gray-500">Ausstehende Zahlungen</h3>
        <p className="mt-2 text-3xl font-semibold text-gray-900">
          {pendingExpenses.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-sm font-medium text-gray-500">Verfügbar</h3>
        <p className={`mt-2 text-3xl font-semibold ${available >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {available.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
        </p>
      </div>
    </div>
  )
} 