import { Transaction } from '@/types'
import { isTransactionDueInSalaryMonth, getSalaryMonthRange } from '@/lib/dateUtils'

interface MonatsUebersichtProps {
  transactions: Transaction[]
}

export default function MonatsUebersicht({ transactions }: MonatsUebersichtProps) {
  const salaryDay = 23 // TODO: Aus den Einstellungen laden
  const { startDate, endDate } = getSalaryMonthRange(salaryDay)

  const totals = transactions.reduce((acc, transaction) => {
    const transactionDate = new Date(transaction.date)
    
    // Für den aktuellen Gehaltsmonat
    if (transactionDate >= startDate && transactionDate <= endDate) {
      if (transaction.amount > 0) {
        acc.currentIncome += transaction.amount
      } else {
        const amount = Math.abs(transaction.amount)
        if (transaction.isConfirmed) {
          acc.currentExpenses += amount
        } else {
          acc.pendingExpenses += amount
        }
      }
    }

    // Gesamtausgaben (bestätigt und ausstehend)
    if (transaction.amount < 0 && !transaction.isConfirmed) {
      acc.totalPendingExpenses += Math.abs(transaction.amount)
    }

    // Verfügbarer Betrag (inkl. nicht bestätigter Ausgaben)
    if (transaction.amount > 0) {
      // Einnahmen nur wenn bestätigt
      if (transaction.isConfirmed) {
        acc.available += transaction.amount
      }
    } else {
      // Ausgaben immer abziehen, egal ob bestätigt oder nicht
      acc.available += transaction.amount
    }

    return acc
  }, {
    currentIncome: 0,
    currentExpenses: 0,
    pendingExpenses: 0,
    totalPendingExpenses: 0,
    available: 0
  })

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-100 rounded-lg px-4 py-2">
          <h3 className="text-sm font-medium text-green-800">Einnahmen (aktueller Monat)</h3>
          <p className="text-xl font-bold text-green-600">
            {totals.currentIncome.toFixed(2)} €
          </p>
        </div>
        <div className="bg-red-100 rounded-lg px-4 py-2">
          <h3 className="text-sm font-medium text-red-800">Ausgaben (aktueller Monat)</h3>
          <div>
            <p className="text-xl font-bold text-red-600">
              {totals.currentExpenses.toFixed(2)} €
            </p>
            {(totals.pendingExpenses > 0 || totals.totalPendingExpenses > 0) && (
              <p className="text-xs text-red-800">
                Nicht bestätigt: {totals.totalPendingExpenses.toFixed(2)} €
                {totals.pendingExpenses > 0 && totals.pendingExpenses !== totals.totalPendingExpenses && (
                  <span className="ml-1">
                    (davon {totals.pendingExpenses.toFixed(2)} € diesen Monat)
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
        <div className="bg-blue-100 rounded-lg px-4 py-2">
          <h3 className="text-sm font-medium text-blue-800">Verfügbar (inkl. nicht bestätigt)</h3>
          <p className="text-xl font-bold text-blue-600">
            {totals.available.toFixed(2)} €
          </p>
        </div>
      </div>
    </div>
  )
} 