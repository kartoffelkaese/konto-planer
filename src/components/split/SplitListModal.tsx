'use client'

import Modal from '@/components/Modal'
import SplitListForm from '@/components/split/SplitListForm'
import type { SplitListSummary } from '@/types/split'

type SplitListModalProps = {
  isOpen: boolean
  onClose: () => void
  onSaved: (list: SplitListSummary) => void | Promise<void>
}

export default function SplitListModal({ isOpen, onClose, onSaved }: SplitListModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Neue Split-Liste" maxWidth="lg">
      {isOpen && (
        <SplitListForm key="new-list" onSaved={onSaved} onCancel={onClose} />
      )}
    </Modal>
  )
}
