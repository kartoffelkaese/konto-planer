'use client'

import Link from 'next/link'
import { Transaction } from '@/types'
import { isTransactionPending, formatDate } from '@/lib/dateUtils'
import { formatCurrency } from '@/lib/formatters'
import { PencilIcon, CheckIcon, MinusCircleIcon, ClockIcon, CalendarIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'
import Modal from '@/components/Modal'
import EditTransactionForm from '@/components/EditTransactionForm'
import { getContrastColor } from '@/lib/colorUtils'

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
  const [error, setError] = useState<string | null>(null)

  const handleToggleConfirmation = async (transaction: Transaction) => {
    try {
      const currentDate = new Date().toISOString();
      const updatedTransaction = {
        ...transaction,
        isConfirmed: !transaction.isConfirmed,
        lastConfirmedDate: !transaction.isConfirmed ? currentDate : null,
      }
      
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTransaction),
      })

      if (!response.ok) {
        throw new Error('Fehler beim Aktualisieren der Transaktion')
      }

      if (transaction.parentTransactionId) {
        const parentResponse = await fetch(`/api/transactions/${transaction.parentTransactionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lastConfirmedDate: currentDate
          }),
        })

        if (!parentResponse.ok) {
          console.error('Fehler beim Aktualisieren der Eltern-Transaktion')
        }
      }

      setEditingDate(null)
      await onTransactionChange()
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
      await onTransactionChange()
    } catch (err) {
      console.error('Fehler beim Aktualisieren der Transaktion:', err)
    }
  }

  const handleEditClick = (transactionId: string) => {
    setSelectedTransactionId(transactionId)
    setShowEditModal(true)
  }

  const handleEditSuccess = async () => {
    setShowEditModal(false)
    setSelectedTransactionId(null)
    await onTransactionChange()
  }

  const handleConfirmTransaction = async (id: string) => {
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isConfirmed: true,
          lastConfirmedDate: new Date().toISOString()
        }),
      })

      if (!response.ok) {
        throw new Error('Fehler beim Bestätigen der Transaktion')
      }

      await onTransactionChange()
    } catch (err) {
      console.error('Error confirming transaction:', err)
      setError('Fehler beim Bestätigen der Transaktion')
    }
  }

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Möchten Sie diese Transaktion wirklich löschen?')) {
      return
    }

    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Fehler beim Löschen der Transaktion')
      }

      await onTransactionChange()
    } catch (err) {
      console.error('Error deleting transaction:', err)
      setError('Fehler beim Löschen der Transaktion')
    }
  }

  return (
    <div className="overflow-hidden">
      {/* Desktop Ansicht */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="border-b">
              <th className="text-left p-4">Datum</th>
              <th className="text-left p-4">Händler</th>
              <th className="text-left p-4">Kategorie</th>
              <th className="text-left p-4">Beschreibung</th>
              <th className="text-right p-4">Betrag</th>
              <th className="text-center p-4">Status</th>
              <th className="text-right p-4">Aktionen</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
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
                  ref={index === transactions.length - 1 ? lastElementRef : undefined}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <button
                        onClick={() => handleEditClick(transaction.id)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        {formatDate(transaction.date)}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.merchant}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {transaction.merchantRef?.category ? (
                      <span 
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: transaction.merchantRef.category.color,
                          color: getContrastColor(transaction.merchantRef.category.color)
                        }}
                      >
                        {transaction.merchantRef.category.name}
                      </span>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {transaction.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span className={transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {transaction.amount >= 0 ? '+' : ''}{transaction.amount.toFixed(2)} €
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <button
                      onClick={() => handleToggleConfirmation(transaction)}
                      title={transaction.isConfirmed ? 'Als nicht bestätigt markieren' : 'Als bestätigt markieren'}
                      className={`inline-flex items-center px-2.5 py-1.5 border text-xs font-medium rounded-full ${
                        transaction.isConfirmed
                          ? 'bg-green-100 text-green-800 border-green-200'
                          : isTransactionPending(transaction)
                          ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                          : 'bg-gray-100 text-gray-800 border-gray-200'
                      }`}
                    >
                      {transaction.isConfirmed ? 'Bestätigt' : isTransactionPending(transaction) ? 'Ausstehend' : 'Offen'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEditClick(transaction.id)}
                      title="Transaktion bearbeiten"
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Ansicht */}
      <div className="md:hidden space-y-4">
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500">
            Keine Transaktionen vorhanden
          </div>
        ) : (
          transactions.map((transaction, index) => (
            <div
              key={transaction.id}
              ref={index === transactions.length - 1 ? lastElementRef : undefined}
              className="rounded-lg shadow p-4"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-medium text-gray-900">{transaction.description}</div>
                  <div className="text-sm text-gray-600">{transaction.merchant}</div>
                  {transaction.merchantRef?.category && (
                    <div className="mt-1">
                      <span 
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: transaction.merchantRef.category.color,
                          color: getContrastColor(transaction.merchantRef.category.color)
                        }}
                      >
                        {transaction.merchantRef.category.name}
                      </span>
                    </div>
                  )}
                </div>
                <div className={`text-right font-medium ${
                  transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.amount >= 0 ? '+' : ''}{transaction.amount.toFixed(2)} €
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  {formatDate(transaction.date)}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleToggleConfirmation(transaction)}
                    title={transaction.isConfirmed ? 'Als nicht bestätigt markieren' : 'Als bestätigt markieren'}
                    className={`inline-flex items-center px-2.5 py-1.5 border text-xs font-medium rounded-full ${
                      transaction.isConfirmed
                        ? 'bg-green-100 text-green-800 border-green-200'
                        : isTransactionPending(transaction)
                        ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                        : 'bg-gray-100 text-gray-800 border-gray-200'
                    }`}
                  >
                    {transaction.isConfirmed ? 'Bestätigt' : isTransactionPending(transaction) ? 'Ausstehend' : 'Offen'}
                  </button>
                  <button
                    onClick={() => handleEditClick(transaction.id)}
                    title="Transaktion bearbeiten"
                    className="text-blue-600 hover:text-blue-900"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
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
    </div>
  )
} 