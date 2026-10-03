import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { buildTransactionsUrl } from './useTransactionFilters'

/** Dialoge „Neue Transaktion“ und „Bearbeiten“ – auch per „?new=1“ / „?edit=<id>“ aus anderen Seiten. */
export function useTransactionDialogs() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showNewTransactionModal, setShowNewTransactionModal] = useState(false)
  const [showEditTransactionModal, setShowEditTransactionModal] = useState(false)
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null)

  // „?new=1“ / „?edit=<id>“: Dialog öffnen, dann die URL bereinigen
  const newParam = searchParams.get('new') === '1'
  const editParam = searchParams.get('edit')
  const urlActionKey = `${newParam}:${editParam ?? ''}`
  const [handledUrlAction, setHandledUrlAction] = useState('')
  if (urlActionKey !== handledUrlAction) {
    setHandledUrlAction(urlActionKey)
    if (newParam) setShowNewTransactionModal(true)
    if (editParam) {
      setSelectedTransactionId(editParam)
      setShowEditTransactionModal(true)
    }
  }

  useEffect(() => {
    if (!newParam && !editParam) return
    const params = new URLSearchParams(searchParams.toString())
    params.delete('new')
    params.delete('edit')
    router.replace(buildTransactionsUrl(params), { scroll: false })
  }, [newParam, editParam, searchParams, router])

  const openNewTransaction = () => setShowNewTransactionModal(true)
  const closeNewTransaction = () => setShowNewTransactionModal(false)

  const openEditTransaction = (id: string) => {
    setSelectedTransactionId(id)
    setShowEditTransactionModal(true)
  }

  const closeEditTransaction = () => setShowEditTransactionModal(false)

  /** Nach dem Speichern: Dialog schließen und Auswahl verwerfen */
  const finishEditTransaction = () => {
    setShowEditTransactionModal(false)
    setSelectedTransactionId(null)
  }

  return {
    showNewTransactionModal,
    showEditTransactionModal,
    selectedTransactionId,
    openNewTransaction,
    closeNewTransaction,
    openEditTransaction,
    closeEditTransaction,
    finishEditTransaction,
  }
}
