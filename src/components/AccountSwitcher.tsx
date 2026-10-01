'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { CheckIcon, ChevronUpDownIcon, WalletIcon } from '@heroicons/react/24/outline'
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
import { getAccounts, setActiveAccount } from '@/lib/api'

type AccountItem = {
  id: string
  name: string
  role: string
  isActive: boolean
  bankId?: string | null
}

interface AccountSwitcherProps {
  /**
   * rail    – schmale Desktop-Leiste: nur Avatar, Wechsel per Dialog
   * sidebar – ausgeklappte Desktop-Leiste: Konto-Karte, Wechsel per Dialog
   * sheet   – mobiles Bottom-Sheet: Konten direkt als Liste
   */
  variant: 'rail' | 'sidebar' | 'sheet'
}

export default function AccountSwitcher({ variant }: AccountSwitcherProps) {
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
      const data = await getAccounts<typeof accounts>()
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
  const iconOnlyMode = variant === 'rail'
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
      await setActiveAccount(accountId)
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
            ? 'bg-accent-subtle'
            : 'hover:bg-surface-muted'
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

  if (variant === 'sheet') {
    return (
      <div className="space-y-0.5" role="list" aria-label="Konten">
        {accounts.map((acc) => renderAccountButton(acc, true))}
      </div>
    )
  }

  const activeBank = getBankById(active?.bankId)

  return (
    <>
      {/* Ein Button für beide Zustände: der Avatar bleibt beim Ein-/Ausklappen an derselben Stelle */}
      <button
        type="button"
        disabled={loading}
        onClick={() => setModalOpen(true)}
        aria-label={`Aktives Konto: ${active?.name ?? 'Konto'}. Konto wechseln`}
        aria-haspopup="dialog"
        className={`nav-tooltip-anchor group relative flex w-full items-center gap-3 rounded-control p-1.5 text-left transition-colors duration-feedback hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
          variant === 'rail' ? '' : 'bg-surface-muted/70'
        }`}
      >
        {active ? (
          <AccountAvatar
            name={active.name}
            bankId={active.bankId}
            active
            animating={avatarAnimating}
            showInitialBadge={showInitialBadge(active.bankId)}
          />
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <WalletIcon className="h-5 w-5" aria-hidden />
          </span>
        )}
        <span className="sidebar-label min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-primary">
            {active?.name ?? 'Konto'}
          </span>
          <span className="block truncate text-xs text-secondary">
            {activeBank?.name ?? 'Konto wechseln'}
          </span>
        </span>
        <ChevronUpDownIcon className="sidebar-label h-5 w-5 shrink-0 text-secondary" aria-hidden />
        {variant === 'rail' && (
          <span className="nav-tooltip" aria-hidden="true">
            {active?.name ?? 'Konto'}
          </span>
        )}
      </button>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Konto wechseln"
        maxWidth="sm"
        preventClose={loading}
      >
        <p className="text-sm text-secondary mb-1">
          Wähle das Konto, dessen Buchungen du anzeigen und bearbeiten möchtest.
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
