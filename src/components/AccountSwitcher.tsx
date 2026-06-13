'use client'

import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { CheckIcon, WalletIcon } from '@heroicons/react/24/outline'
import { useToast } from '@/hooks/useToast'
import Modal from '@/components/Modal'
import LoadingSpinner from '@/components/LoadingSpinner'
import AccountAvatar from '@/components/AccountAvatar'
import { getDuplicateBankIds } from '@/lib/accountBankBadge'
import { getBankById } from '@/lib/germanBanks'
import {
  ACCOUNT_SWITCH_EXIT_MS,
  dispatchAccountChanged,
  dispatchAccountSwitching,
} from '@/lib/accountSwitchEvents'

type AccountItem = {
  id: string
  name: string
  role: string
  isActive: boolean
  bankId?: string | null
}

interface AccountSwitcherProps {
  showExpanded: boolean
  iconOnlyMode: boolean
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
  const [switchingId, setSwitchingId] = useState<string | null>(null)
  const [avatarAnimating, setAvatarAnimating] = useState(false)

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

  const duplicateBankIds = useMemo(
    () => getDuplicateBankIds(accounts),
    [accounts]
  )

  const showInitialBadge = (bankId?: string | null) =>
    iconOnlyMode && !!bankId && duplicateBankIds.has(bankId)

  const switchAccount = async (accountId: string) => {
    if (accountId === active?.id) {
      setModalOpen(false)
      return
    }
    setLoading(true)
    setSwitchingId(accountId)
    dispatchAccountSwitching()
    await new Promise((resolve) => setTimeout(resolve, ACCOUNT_SWITCH_EXIT_MS))
    try {
      const res = await fetch('/api/accounts/active', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      })
      if (!res.ok) throw new Error('Wechsel fehlgeschlagen')
      await update({ activeAccountId: accountId })
      setModalOpen(false)
      setAvatarAnimating(true)
      router.refresh()
      dispatchAccountChanged()
      window.setTimeout(() => setAvatarAnimating(false), 320)
    } catch {
      showToast('Kontowechsel fehlgeschlagen', 'error')
    } finally {
      setLoading(false)
      setSwitchingId(null)
    }
  }

  const renderAccountButton = (acc: AccountItem, compact?: boolean) => {
    const isActive = acc.isActive
    const isSwitching = switchingId === acc.id
    const bank = getBankById(acc.bankId)

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
        } ${isSwitching ? 'opacity-80' : ''}`}
        aria-current={isActive ? 'true' : undefined}
        aria-busy={isSwitching || undefined}
      >
        <AccountAvatar
          name={acc.name}
          bankId={acc.bankId}
          active={isActive}
          animating={isActive && avatarAnimating}
          showInitialBadge={showInitialBadge(acc.bankId)}
        />
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-sm ${
              isActive ? 'font-semibold text-accent' : 'font-medium text-primary'
            }`}
          >
            {acc.name}
          </span>
          <span className="block truncate text-xs text-secondary">
            {bank?.name ??
              (acc.role === 'OWNER'
                ? 'Inhaber'
                : acc.role === 'MEMBER'
                  ? 'Geteilt'
                  : 'Nur Lesen')}
          </span>
          {bank && acc.role !== 'OWNER' && (
            <span className="block text-xs text-secondary/80">
              {acc.role === 'MEMBER' ? 'Geteilt' : 'Nur Lesen'}
            </span>
          )}
        </span>
        {isSwitching ? (
          <LoadingSpinner size="sm" className="shrink-0 text-accent" />
        ) : isActive ? (
          <CheckIcon className="h-5 w-5 shrink-0 text-accent" aria-hidden />
        ) : null}
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
          {active ? (
            <AccountAvatar
              name={active.name}
              bankId={active.bankId}
              size="md"
              active
              animating={avatarAnimating}
              showInitialBadge={showInitialBadge(active.bankId)}
            />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <WalletIcon className="h-5 w-5" aria-hidden />
            </span>
          )}
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
        preventClose={loading}
      >
        <p className="text-sm text-secondary mb-1">
          Wählen Sie das Konto, dessen Buchungen Sie anzeigen und bearbeiten möchten.
        </p>
        <p className="text-xs text-secondary mb-4">
          {accounts.length} Konten verfügbar
          {active ? (
            <>
              {' '}
              · Aktiv: <span className="font-medium text-primary">{active.name}</span>
            </>
          ) : null}
        </p>
        {loading && (
          <div
            className="mb-3 flex items-center gap-2 text-sm text-accent"
            role="status"
            aria-live="polite"
          >
            <LoadingSpinner size="sm" />
            Konto wird gewechselt…
          </div>
        )}
        <div className="space-y-0.5" role="list" aria-label="Konten">
          {accounts.map((acc) => renderAccountButton(acc, true))}
        </div>
      </Modal>
    </>
  )
}
