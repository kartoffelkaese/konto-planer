'use client'

import Link from 'next/link'
import { Transaction } from '@/types'
import { isTransactionPending, formatDate } from '@/lib/dateUtils'
import { formatCurrency } from '@/lib/formatters'
import { PencilIcon, CheckIcon, MinusCircleIcon, ClockIcon, CalendarIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'
import Modal from '@/components/Modal'
import EditTransactionForm from '@/components/EditTransactionForm'

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
  const [editingDate, setEditingDate] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null)

  const handleToggleConfirmation = async (transaction: Transaction) => {
    try {
      const updatedTransaction = {
        ...transaction,
        isConfirmed: !transaction.isConfirmed,
        lastConfirmedDate: !transaction.isConfirmed ? transaction.date : null,
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

      setEditingDate(null)
      onTransactionChange()
    } catch (err) {
      console.error('Fehler beim Aktualisieren der Transaktion:', err)
    }
  }

  const handleUpdateDate = async (transaction: Transaction, newDate: string) => {
    try {
      const updatedTransaction = {
        ...transaction,
        date: newDate,
        lastConfirmedDate: transaction.isConfirmed ? newDate : transaction.lastConfirmedDate
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

      setEditingDate(null)
      onTransactionChange()
    } catch (err) {
      console.error('Fehler beim Aktualisieren der Transaktion:', err)
    }
  }

  const handleEditClick = (transactionId: string) => {
    setSelectedTransactionId(transactionId)
    setShowEditModal(true)
  }

  const handleEditSuccess = () => {
    setShowEditModal(false)
    setSelectedTransactionId(null)
    onTransactionChange()
  }

  return (
    <>
      <div className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Datum
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Händler
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Beschreibung
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Betrag
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500 bg-gray-50">
                    <div className="flex flex-col items-center justify-center">
                      <svg className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p>Keine Transaktionen vorhanden</p>
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((transaction, index) => (
                  <tr 
                    key={transaction.id} 
                    ref={index === transactions.length - 1 ? lastElementRef : null}
                    className="hover:bg-gray-50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {editingDate === transaction.id ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <button
                            onClick={() => handleUpdateDate(transaction, selectedDate)}
                            className="text-green-600 hover:text-green-700 transition-colors duration-150"
                          >
                            <CheckIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => setEditingDate(null)}
                            className="text-red-600 hover:text-red-700 transition-colors duration-150"
                          >
                            <MinusCircleIcon className="h-5 w-5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{formatDate(transaction.date)}</span>
                          <button
                            onClick={() => {
                              setEditingDate(transaction.id)
                              setSelectedDate(new Date(transaction.date).toISOString().split('T')[0])
                            }}
                            className="text-gray-400 hover:text-gray-600 transition-colors duration-150"
                          >
                            <CalendarIcon className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {transaction.merchant || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="flex items-center">
                        <span className="flex-grow font-medium">{transaction.description}</span>
                        {transaction.isRecurring && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {transaction.recurringInterval === 'monthly' 
                              ? 'Monatlich'
                              : transaction.recurringInterval === 'quarterly'
                                ? 'Vierteljährlich'
                                : transaction.recurringInterval === 'yearly'
                                  ? 'Jährlich'
                                  : transaction.recurringInterval}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                      transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <button
                        onClick={() => handleToggleConfirmation(transaction)}
                        className={`inline-flex items-center px-3 py-1.5 text-sm rounded-lg border ${
                          transaction.isConfirmed
                            ? 'border-green-600 text-green-600 hover:bg-green-50'
                            : isTransactionPending(transaction)
                              ? 'border-yellow-600 text-yellow-600 hover:bg-yellow-50'
                              : 'border-gray-600 text-gray-600 hover:bg-gray-50'
                        } transition-colors duration-150`}
                      >
                        {transaction.isConfirmed ? (
                          <CheckIcon className="h-4 w-4 mr-1.5" />
                        ) : isTransactionPending(transaction) ? (
                          <ClockIcon className="h-4 w-4 mr-1.5" />
                        ) : (
                          <MinusCircleIcon className="h-4 w-4 mr-1.5" />
                        )}
                        {transaction.isConfirmed 
                          ? 'Bestätigt' 
                          : isTransactionPending(transaction)
                            ? 'Ausstehend'
                            : 'Nicht bestätigt'
                        }
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <button
                        onClick={() => handleEditClick(transaction.id)}
                        className="inline-flex items-center px-3 py-1.5 text-sm rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors duration-150"
                      >
                        <PencilIcon className="h-4 w-4 mr-1.5" />
                        Bearbeiten
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bearbeiten Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Transaktion bearbeiten"
        maxWidth="md"
      >
        {selectedTransactionId && (
          <EditTransactionForm
            id={selectedTransactionId}
            onSuccess={handleEditSuccess}
            onCancel={() => setShowEditModal(false)}
          />
        )}
      </Modal>
    </>
  )
} 