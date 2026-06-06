'use client'

import { useMemo, useState } from 'react'
import {
  CheckIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import Modal from '@/components/Modal'
import { GERMAN_BANKS, getBankById } from '@/lib/germanBanks'

type BankSelectProps = {
  value: string | null
  onChange: (bankId: string | null) => void
  disabled?: boolean
  id?: string
}

function BankLogo({
  logoPath,
  size = 'sm',
}: {
  logoPath?: string
  size?: 'sm' | 'md'
}) {
  const boxClass = size === 'md' ? 'h-10 w-10' : 'h-8 w-8'
  const imgSize = size === 'md' ? 32 : 24

  if (!logoPath) {
    return (
      <span
        className={`flex ${boxClass} shrink-0 items-center justify-center rounded-lg border border-border bg-surface-muted text-xs font-semibold text-secondary`}
        aria-hidden
      >
        —
      </span>
    )
  }

  return (
    <span
      className={`flex ${boxClass} shrink-0 items-center justify-center rounded-lg border border-border bg-white p-1`}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoPath}
        alt=""
        width={imgSize}
        height={imgSize}
        draggable={false}
        className="pointer-events-none h-full w-full object-contain"
      />
    </span>
  )
}

export default function BankSelect({
  value,
  onChange,
  disabled = false,
  id = 'bankId',
}: BankSelectProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selected = getBankById(value)

  const filteredBanks = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return GERMAN_BANKS
    return GERMAN_BANKS.filter((bank) => bank.name.toLowerCase().includes(q))
  }, [query])

  const closeModal = () => {
    setModalOpen(false)
    setQuery('')
  }

  const handleSelect = (bankId: string | null) => {
    onChange(bankId)
    closeModal()
  }

  return (
    <>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setModalOpen(true)}
        className="flex w-full items-center gap-3 rounded-control border border-border bg-surface px-3 py-2.5 text-left shadow-sm transition-colors duration-feedback hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
        aria-haspopup="dialog"
        aria-expanded={modalOpen}
      >
        <BankLogo logoPath={selected?.logoPath} size="md" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-primary">
            {selected?.name ?? 'Keine Zuordnung'}
          </span>
          {!selected && (
            <span className="block text-xs text-secondary">Bank wählen…</span>
          )}
        </span>
        <ChevronRightIcon className="h-5 w-5 shrink-0 text-secondary" aria-hidden />
      </button>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title="Bank auswählen"
        maxWidth="sm"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-control border border-border bg-surface px-3 py-2 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
            <MagnifyingGlassIcon
              className="h-4 w-4 shrink-0 text-secondary"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Bank suchen…"
              autoFocus
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-primary placeholder:text-secondary focus:outline-none focus:ring-0"
              aria-controls={`${id}-list`}
            />
          </div>

          <div
            id={`${id}-list`}
            role="listbox"
            aria-label="Banken"
            className="max-h-72 overflow-y-auto rounded-control border border-border bg-surface"
          >
            <button
              type="button"
              role="option"
              aria-selected={value === null}
              onClick={() => handleSelect(null)}
              className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors duration-feedback hover:bg-accent-muted focus:outline-none focus-visible:bg-accent-muted ${
                value === null
                  ? 'bg-accent-subtle font-medium text-accent'
                  : 'text-primary'
              }`}
            >
              <BankLogo />
              <span className="min-w-0 flex-1">Keine Zuordnung</span>
              {value === null && (
                <CheckIcon className="h-5 w-5 shrink-0 text-accent" aria-hidden />
              )}
            </button>

            {filteredBanks.map((bank) => {
              const isSelected = value === bank.id
              return (
                <button
                  key={bank.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(bank.id)}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors duration-feedback hover:bg-accent-muted focus:outline-none focus-visible:bg-accent-muted ${
                    isSelected
                      ? 'bg-accent-subtle font-medium text-accent'
                      : 'text-primary'
                  }`}
                >
                  <BankLogo logoPath={bank.logoPath} />
                  <span className="min-w-0 flex-1 truncate">{bank.name}</span>
                  {isSelected && (
                    <CheckIcon className="h-5 w-5 shrink-0 text-accent" aria-hidden />
                  )}
                </button>
              )
            })}

            {filteredBanks.length === 0 && (
              <p className="px-3 py-4 text-sm text-secondary">Keine Bank gefunden.</p>
            )}
          </div>
        </div>
      </Modal>
    </>
  )
}
