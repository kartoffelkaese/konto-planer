import { useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import { formatCurrency } from '@/lib/formatters'
import { formatDate } from '@/lib/dateUtils'

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
  const [isExpanded, setIsExpanded] = useState(false)
  // Berechne die "cleared balance" aus allen bestätigten Transaktionen
  const clearedBalance = totalIncome - totalExpenses

  return (
    <div className="space-y-4">
      {/* Mobile: Ausklappbare Übersicht */}
      <div className="md:hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-xl p-4 shadow-sm flex items-center justify-between"
        >
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="p-1.5 bg-indigo-200 dark:bg-indigo-800 rounded-lg">
                <svg className="w-4 h-4 text-indigo-700 dark:text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-indigo-800 dark:text-indigo-200">Kontostand</h3>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300">
              {formatCurrency(clearedBalance)}
            </p>
            {isExpanded ? (
              <ChevronUpIcon className="h-5 w-5 text-indigo-700 dark:text-indigo-300" />
            ) : (
              <ChevronDownIcon className="h-5 w-5 text-indigo-700 dark:text-indigo-300" />
            )}
          </div>
        </button>

        {/* Ausgeklappte Ansicht */}
        {isExpanded && (
          <div className="mt-4 space-y-4">
            {/* Einnahmen */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="p-1.5 bg-green-200 dark:bg-green-800 rounded-lg">
                      <svg className="w-4 h-4 text-green-700 dark:text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-green-800 dark:text-green-200">Einnahmen</h3>
                    <p className="text-xs text-green-600 dark:text-green-400">Aktueller Monat</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-green-700 dark:text-green-300">
                  {formatCurrency(currentIncome)}
                </p>
              </div>
            </div>

            {/* Uncleared Transactions */}
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="p-1.5 bg-yellow-200 dark:bg-yellow-800 rounded-lg">
                      <svg className="w-4 h-4 text-yellow-700 dark:text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Ausstehend</h3>
                  </div>
                </div>
                <p className="text-lg font-bold text-yellow-700 dark:text-yellow-300">
                  {formatCurrency(totalPendingExpenses)}
                </p>
              </div>
            </div>

            {/* Verfügbar */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="p-1.5 bg-blue-200 dark:bg-blue-800 rounded-lg">
                      <svg className="w-4 h-4 text-blue-700 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">Verfügbar</h3>
                    <p className="text-xs text-blue-600 dark:text-blue-400">Inkl. nicht bestätigt</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                  {formatCurrency(available)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tablet: 2x2 Grid */}
      <div className="hidden md:grid md:grid-cols-2 md:gap-4 lg:hidden">
        {/* Einnahmen */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="p-1.5 bg-green-200 dark:bg-green-800 rounded-lg">
                  <svg className="w-4 h-4 text-green-700 dark:text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-green-800 dark:text-green-200">Einnahmen</h3>
                <p className="text-xs text-green-600 dark:text-green-400">Aktueller Monat</p>
              </div>
            </div>
            <p className="text-lg font-bold text-green-700 dark:text-green-300">
              {formatCurrency(currentIncome)}
            </p>
          </div>
        </div>

        {/* Cleared Balance */}
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="p-1.5 bg-indigo-200 dark:bg-indigo-800 rounded-lg">
                  <svg className="w-4 h-4 text-indigo-700 dark:text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-indigo-800 dark:text-indigo-200">Kontostand</h3>
              </div>
            </div>
            <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300">
              {formatCurrency(clearedBalance)}
            </p>
          </div>
        </div>

        {/* Uncleared Transactions */}
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="p-1.5 bg-yellow-200 dark:bg-yellow-800 rounded-lg">
                  <svg className="w-4 h-4 text-yellow-700 dark:text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Ausstehend</h3>
              </div>
            </div>
            <p className="text-lg font-bold text-yellow-700 dark:text-yellow-300">
              {formatCurrency(totalPendingExpenses)}
            </p>
          </div>
        </div>

        {/* Verfügbar */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="p-1.5 bg-blue-200 dark:bg-blue-800 rounded-lg">
                  <svg className="w-4 h-4 text-blue-700 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">Verfügbar</h3>
                <p className="text-xs text-blue-600 dark:text-blue-400">Inkl. nicht bestätigt</p>
              </div>
            </div>
            <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
              {formatCurrency(available)}
            </p>
          </div>
        </div>
      </div>

      {/* Desktop: 4x1 Grid */}
      <div className="hidden lg:grid lg:grid-cols-4 lg:gap-4">
        {/* Einnahmen */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="p-1.5 bg-green-200 dark:bg-green-800 rounded-lg">
                  <svg className="w-4 h-4 text-green-700 dark:text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-green-800 dark:text-green-200">Einnahmen</h3>
                <p className="text-xs text-green-600 dark:text-green-400">Aktueller Monat</p>
              </div>
            </div>
            <p className="text-lg font-bold text-green-700 dark:text-green-300">
              {formatCurrency(currentIncome)}
            </p>
          </div>
        </div>

        {/* Cleared Balance */}
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="p-1.5 bg-indigo-200 dark:bg-indigo-800 rounded-lg">
                  <svg className="w-4 h-4 text-indigo-700 dark:text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-indigo-800 dark:text-indigo-200">Kontostand</h3>
              </div>
            </div>
            <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300">
              {formatCurrency(clearedBalance)}
            </p>
          </div>
        </div>

        {/* Uncleared Transactions */}
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="p-1.5 bg-yellow-200 dark:bg-yellow-800 rounded-lg">
                  <svg className="w-4 h-4 text-yellow-700 dark:text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Ausstehend</h3>
              </div>
            </div>
            <p className="text-lg font-bold text-yellow-700 dark:text-yellow-300">
              {formatCurrency(totalPendingExpenses)}
            </p>
          </div>
        </div>

        {/* Verfügbar */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="p-1.5 bg-blue-200 dark:bg-blue-800 rounded-lg">
                  <svg className="w-4 h-4 text-blue-700 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">Verfügbar</h3>
                <p className="text-xs text-blue-600 dark:text-blue-400">Inkl. nicht bestätigt</p>
              </div>
            </div>
            <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
              {formatCurrency(available)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 