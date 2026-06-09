'use client'

import Image from 'next/image'
import { getBankById } from '@/lib/germanBanks'

function accountInitial(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return trimmed.slice(0, 2).toUpperCase()
}

type AccountAvatarProps = {
  name: string
  bankId?: string | null
  size?: 'sm' | 'md'
  active?: boolean
  animating?: boolean
  showInitialBadge?: boolean
  className?: string
}

const sizeClasses = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-10 w-10 text-sm',
} as const

const imageSizes = {
  sm: 24,
  md: 28,
} as const

const badgeClasses = {
  sm: 'h-4 min-w-4 px-0.5 text-[8px]',
  md: 'h-4 min-w-4 px-0.5 text-[9px]',
} as const

export default function AccountAvatar({
  name,
  bankId,
  size = 'sm',
  active = false,
  animating = false,
  showInitialBadge = false,
  className = '',
}: AccountAvatarProps) {
  const bank = getBankById(bankId)
  const sizeClass = sizeClasses[size]
  const imageSize = imageSizes[size]
  const initials = accountInitial(name)

  if (bank) {
    return (
      <span
        className={`relative inline-flex shrink-0 ${className}`}
        aria-hidden
      >
        <span
          className={`flex items-center justify-center rounded-lg border border-border bg-surface p-1 ${sizeClass} ${
            animating ? 'account-switch-avatar' : ''
          }`}
        >
          <Image
            src={bank.logoPath}
            alt=""
            width={imageSize}
            height={imageSize}
            className="h-full w-full object-contain"
          />
        </span>
        {showInitialBadge && (
          <span
            className={`absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full border border-border bg-accent font-bold leading-none text-accent-foreground ${badgeClasses[size]}`}
          >
            {initials}
          </span>
        )}
      </span>
    )
  }

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${sizeClass} ${
        active
          ? 'bg-accent text-accent-foreground'
          : 'bg-surface-muted text-secondary'
      } ${animating ? 'account-switch-avatar' : ''} ${className}`}
      aria-hidden
    >
      {accountInitial(name)}
    </span>
  )
}

export { accountInitial }
