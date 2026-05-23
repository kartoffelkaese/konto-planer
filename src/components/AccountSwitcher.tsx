'use client'

import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { CheckIcon, WalletIcon } from '@heroicons/react/24/outline'
import { useToast } from '@/hooks/useToast'
import Modal from '@/components/Modal'

type AccountItem = {
  id: string
  name: string
  role: string
  isActive: boolean
}

interface AccountSwitcherProps {
  showExpanded: boolean
  iconOnlyMode: boolean
}

function accountInitial(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return trimmed.slice(0, 2).toUpperCase()
}

export default function AccountSwitcher({
  showExpanded,
  iconOnlyMode,
}: AccountSwitcherProps) {
  const router = useRouter()
  const { data: session, update } = useSession()
  const { showToast } = useToast()
  const [accounts, setAccounts] = useState<AccountItem[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const loadAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/accounts')
      if (!res.ok) return
      const data = await res.json()
      setAccounts(data)
    } catch {
      // optional
    }
  }, [])

  useEffect(() => {
    if (session) loadAccounts()
  }, [session, loadAccounts])

  useEffect(() => {
    const onAccountChanged = () => loadAccounts()
    window.addEventListener('account-changed', onAccountChanged)
    return () => window.removeEventListener('account-changed', onAccountChanged)
  }, [loadAccounts])

  const active = accounts.find((a) => a.isActive) ?? accounts[0]
  const listMode = showExpanded && !iconOnlyMode
  const showSwitcher = accounts.length > 1

  const switchAccount = async (accountId: string) => {
    if (accountId === active?.id) {
      setModalOpen(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/accounts/active', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      })
      if (!res.ok) throw new Error('Wechsel fehlgeschlagen')
      await update({ activeAccountId: accountId })
      setModalOpen(false)
      router.refresh()
      window.dispatchEvent(new Event('account-changed'))
    } catch {
      showToast('Kontowechsel fehlgeschlagen', 'error')
    } finally {
      setLoading(false)
    }
  }

  const renderAccountButton = (acc: AccountItem, compact?: boolean) => {
    const isActive = acc.isActive
    return (
      <button
        key={acc.id}
        type="button"
        disabled={loading}
        onClick={() => switchAccount(acc.id)}
        className={`flex w-full items-center gap-3 rounded-control text-left transition-colors duration-feedback focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
          compact ? 'px-3 py-2.5' : 'px-2 py-2'
        } ${
          isActive
            ? 'bg-accent-subtle border-l-[3px] border-l-accent pl-[calc(0.5rem-3px)]'
            : 'border-l-[3px] border-l-transparent hover:bg-accent-muted'
        }`}
        aria-current={isActive ? 'true' : undefined}
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
            isActive
              ? 'bg-accent text-accent-foreground'
              : 'bg-surface-muted text-secondary'
          }`}
          aria-hidden
        >
          {accountInitial(acc.name)}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-sm ${
              isActive ? 'font-semibold text-accent' : 'font-medium text-primary'
            }`}
          >
            {acc.name}
          </span>
          {acc.role === 'OWNER' && (
            <span className="block text-xs text-secondary">Inhaber</span>
          )}
          {acc.role === 'MEMBER' && (
            <span className="block text-xs text-secondary">Geteilt</span>
          )}
        </span>
        {isActive && (
          <CheckIcon className="h-5 w-5 shrink-0 text-accent" aria-hidden />
        )}
      </button>
    )
  }

  if (!session || !showSwitcher) return null

  const borderWrapper = (children: ReactNode) => (
    <div className="border-t border-border">{children}</div>
  )

  if (listMode) {
    return borderWrapper(
      <div className="px-2 py-2">
        <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-secondary">
          Konto wechseln
        </p>
        <div className="space-y-0.5" role="list" aria-label="Konten">
          {accounts.map((acc) => renderAccountButton(acc))}
        </div>
      </div>
    )
  }

  return borderWrapper(
    <>
      <div className="px-2 py-2 flex justify-center md:justify-center">
        <button
          type="button"
          disabled={loading}
          onClick={() => setModalOpen(true)}
          title={`Aktives Konto: ${active?.name ?? 'Konto'}. Tippen zum Wechseln.`}
          className="flex flex-col items-center gap-1 rounded-control p-2 text-accent hover:bg-accent-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent max-md:flex-row max-md:gap-2 max-md:px-3 max-md:w-full max-md:justify-start"
          aria-haspopup="dialog"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
            {active ? (
              accountInitial(active.name)
            ) : (
              <WalletIcon className="h-5 w-5" aria-hidden />
            )}
          </span>
          <span className="md:sr-only text-sm font-medium text-primary truncate max-w-[10rem]">
            {active?.name ?? 'Konto'}
          </span>
        </button>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Konto wechseln"
        maxWidth="sm"
      >
        <p className="text-sm text-secondary mb-3">
          Wählen Sie das Konto, dessen Buchungen Sie anzeigen und bearbeiten möchten.
        </p>
        <div className="space-y-0.5" role="list">
          {accounts.map((acc) => renderAccountButton(acc, true))}
        </div>
      </Modal>
    </>
  )
}
