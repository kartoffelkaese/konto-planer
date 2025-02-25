import Link from 'next/link'
import { Transaction } from '@/types'
import { isTransactionPending, formatDate } from '@/lib/dateUtils'
import { PencilIcon, CheckIcon, MinusCircleIcon, ClockIcon } from '@heroicons/react/24/outline'

interface TransactionListProps {
  transactions: Transaction[]
  onTransactionChange: () => void
  lastElementRef: (node: HTMLElement | null) => void
}

export default function TransactionList({ 
  transactions, 
  onTransactionChange,
  lastElementRef 
}: TransactionListProps) {
  const handleToggleConfirmation = async (transaction: Transaction) => {
    try {
      const updatedTransaction = {
        ...transaction,
        isConfirmed: !transaction.isConfirmed,
        lastConfirmedDate: !transaction.isConfirmed ? new Date().toISOString() : null
      }
      
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedTransaction),
      })

      if (!response.ok) {
        throw new Error('Fehler beim Aktualisieren der Transaktion')
      }

      onTransactionChange()
    } catch (err) {
      console.error('Fehler beim Aktualisieren der Transaktion:', err)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-4">Datum</th>
              <th className="text-left p-4">Beschreibung</th>
              <th className="text-right p-4">Betrag</th>
              <th className="text-center p-4">Status</th>
              <th className="text-right p-4">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center p-4 text-gray-500">
                  Keine Transaktionen vorhanden
                </td>
              </tr>
            ) : (
              transactions.map((transaction, index) => (
                <tr 
                  key={transaction.id} 
                  ref={index === transactions.length - 1 ? lastElementRef : null}
                  className="border-b hover:bg-gray-50"
                >
                  <td className="p-4">
                    {formatDate(transaction.date)}
                  </td>
                  <td className="p-4">
                    {transaction.description}
                    {transaction.isRecurring && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {transaction.recurringInterval === 'monthly' 
                          ? 'Monatlich'
                          : transaction.recurringInterval === 'quarterly'
                            ? 'Vierteljährlich'
                            : transaction.recurringInterval === 'yearly'
                              ? 'Jährlich'
                              : transaction.recurringInterval}
                      </span>
                    )}
                  </td>
                  <td className={`p-4 text-right ${
                    transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.amount.toFixed(2)} €
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleToggleConfirmation(transaction)}
                      className={`inline-flex items-center px-2 py-1 text-sm rounded border ${
                        transaction.isConfirmed
                          ? 'border-green-600 text-green-600 hover:bg-green-50'
                          : isTransactionPending(transaction)
                            ? 'border-yellow-600 text-yellow-600 hover:bg-yellow-50'
                            : 'border-gray-600 text-gray-600 hover:bg-gray-50'
                      } transition-colors`}
                    >
                      {transaction.isConfirmed ? (
                        <CheckIcon className="h-4 w-4 mr-1" />
                      ) : isTransactionPending(transaction) ? (
                        <ClockIcon className="h-4 w-4 mr-1" />
                      ) : (
                        <MinusCircleIcon className="h-4 w-4 mr-1" />
                      )}
                      {transaction.isConfirmed 
                        ? 'Bestätigt' 
                        : isTransactionPending(transaction)
                          ? 'Ausstehend'
                          : 'Nicht bestätigt'
                      }
                    </button>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/transactions/${transaction.id}/edit`}
                        className="inline-flex items-center px-2 py-1 text-sm rounded border border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <PencilIcon className="h-4 w-4 mr-1" />
                        Bearbeiten
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
} 