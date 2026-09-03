'use client'

import Modal from '@/components/Modal'
import SplitExpenseForm from '@/components/split/SplitExpenseForm'
import type { SplitCategory, SplitExpense, SplitListCurrency, SplitParticipant } from '@/types/split'

type SplitExpenseModalProps = {
  isOpen: boolean
  onClose: () => void
  listId: string
  participants: SplitParticipant[]
  categories: SplitCategory[]
  currencies: SplitListCurrency[]
  expense?: SplitExpense | null
  onSaved: () => void | Promise<void>
}

export default function SplitExpenseModal({
  isOpen,
  onClose,
  listId,
  participants,
  categories,
  currencies,
  expense,
  onSaved,
}: SplitExpenseModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={expense ? 'Ausgabe bearbeiten' : 'Neue Ausgabe'}
      maxWidth="lg"
    >
      {isOpen && participants.length > 0 && (
        <SplitExpenseForm
          key={expense?.id ?? 'new'}
          listId={listId}
          participants={participants}
          categories={categories}
          currencies={currencies}
          expense={expense}
          onSaved={async () => {
            await onSaved()
          }}
          onCancel={onClose}
        />
      )}
    </Modal>
  )
}
