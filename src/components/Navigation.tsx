'use client'

import { useState, useEffect, type CSSProperties } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  HomeIcon,
  ChartPieIcon,
  BanknotesIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  UserGroupIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowRightOnRectangleIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline'
import { APP_VERSION } from '@/lib/version'
import { signOut } from 'next-auth/react'
import ConfirmDialog from '@/components/ConfirmDialog'
import AccountSwitcher from '@/components/AccountSwitcher'
import { useToast } from '@/hooks/useToast'
import { useUserSettings } from '@/hooks/useUserSettings'

const labelTransition =
  'overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin] duration-300 ease-in-out'

function formatBadgeCount(count: number): string {
  if (count > 99) return '99+'
  return String(count)
}

export default function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const { showToast } = useToast()
  const { isSimpleAccount } = useUserSettings()
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [badges, setBadges] = useState({
    unconfirmedTransactions: 0,
    recurringAttention: 0,
    pendingInvitations: 0,
    pendingSplitInvitations: 0,
  })

  useEffect(() => {
    const root = document.documentElement.style
    if (!session) {
      root.setProperty('--sidebar-width', '0')
      root.setProperty('--mobile-tabbar-space', '0px')
      return
    }
    root.setProperty('--sidebar-width', isCollapsed ? '4.5rem' : '16rem')
    root.setProperty(
      '--mobile-tabbar-space',
      'calc(var(--mobile-tabbar-height) + env(safe-area-inset-bottom, 0px))'
    )
  }, [session, isCollapsed])

  useEffect(() => {
    if (!session) return

    const loadBadges = async () => {
      try {
        const response = await fetch('/api/nav-badges')
        if (!response.ok) return
        const data = await response.json()
        setBadges({
          unconfirmedTransactions: data.unconfirmedTransactions ?? 0,
          recurringAttention: data.recurringAttention ?? 0,
          pendingInvitations: data.pendingInvitations ?? 0,
          pendingSplitInvitations: data.pendingSplitInvitations ?? 0,
        })
      } catch {
        // Badge ist optional – Fehler still ignorieren
      }
    }

    loadBadges()
    window.addEventListener('focus', loadBadges)
    const interval = setInterval(loadBadges, 60_000)
    return () => {
      window.removeEventListener('focus', loadBadges)
      clearInterval(interval)
    }
  }, [session])

  useEffect(() => {
    if (!session) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'n' || e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement
      if (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) ||
        el.isContentEditable
      ) {
        return
      }
      e.preventDefault()

      if (pathname === '/split') {
        router.push('/split?new=1')
        return
      }

      const splitDetailMatch = pathname.match(/^\/split\/([^/]+)$/)
      if (splitDetailMatch && splitDetailMatch[1] !== 'new') {
        router.push(`${pathname}?new=1`)
        return
      }

      router.push('/transactions?new=1')
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [session, router, pathname])

  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', onEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onEscape)
    }
  }, [isOpen])

  if (!session) {
    return null
  }

  const navigation = [
    { name: 'Dashboard', href: '/', icon: HomeIcon, badge: 0 },
    {
      name: 'Transaktionen',
      href: '/transactions',
      icon: BanknotesIcon,
      badge: badges.unconfirmedTransactions,
      badgeLabel: 'unbestätigte Buchungen',
    },
    ...(!isSimpleAccount
      ? [
          {
            name: 'Wiederkehrend',
            href: '/recurring',
            icon: ArrowPathIcon,
            badge: badges.recurringAttention,
            badgeLabel: 'fällige wiederkehrende Zahlungen',
          },
        ]
      : []),
    { name: 'Statistiken', href: '/statistics', icon: ChartPieIcon, badge: 0 },
    {
      name: 'Split',
      href: '/split',
      icon: UserGroupIcon,
      badge: badges.pendingSplitInvitations,
      badgeLabel: 'offene Split-Einladungen',
    },
    {
      name: 'Einstellungen',
      href: '/settings',
      icon: Cog6ToothIcon,
      badge: badges.pendingInvitations,
      badgeLabel: 'offene Einladungen',
    },
  ]

  const isActive = (path: string) => {
    if (path === '/settings') {
      return pathname === '/settings' || pathname.startsWith('/settings/')
    }
    if (path === '/split') {
      return pathname === '/split' || pathname.startsWith('/split/')
    }
    return pathname === path
  }

  /** Mobil-Drawer oder Desktop ausgeklappt → volle Nav mit Text */
  const showExpandedContent = !isCollapsed || isOpen
  /** Nur schmale Desktop-Leiste (Icons) */
  const iconOnlyMode = isCollapsed && !isOpen

  const labelVisibility = showExpandedContent
    ? 'max-w-[11rem] opacity-100 ml-3'
    : 'max-w-0 opacity-0 ml-0'

  const navItemClasses = (active: boolean) => {
    const layout = iconOnlyMode
      ? 'md:justify-center md:px-2 py-2 px-3'
      : 'px-3 py-2'

    const base = `flex items-center min-h-11 rounded-control transition-colors duration-feedback ${layout}`

    if (active) {
      return `${base} bg-accent-subtle text-accent font-semibold`
    }

    return `${base} text-secondary hover:bg-surface-muted hover:text-primary`
  }

  /** Mobile Tab-Bar: Hauptziele direkt, Rest hinter „Mehr“ */
  const tabHrefs = ['/', '/transactions', '/split']
  const tabLabels: Record<string, string> = {
    '/': 'Übersicht',
    '/transactions': 'Buchungen',
    '/split': 'Split',
  }
  const tabItems = navigation.filter((item) => tabHrefs.includes(item.href))
  const moreItems = navigation.filter((item) => !tabHrefs.includes(item.href))
  const moreBadge = moreItems.reduce((sum, item) => sum + item.badge, 0)
  const moreActive = isOpen || moreItems.some((item) => isActive(item.href))

  return (
    <>
      <header className="md:hidden sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-hairline bg-canvas/85 px-4 backdrop-blur-md">
        <Link
          href="/"
          className="flex min-h-11 items-center gap-2 text-lg font-semibold tracking-tight text-primary truncate"
          onClick={() => setIsOpen(false)}
        >
          <span
            className="flex h-7 w-7 items-center justify-center rounded-[0.6rem] bg-accent text-sm font-bold text-accent-foreground"
            aria-hidden="true"
          >
            K
          </span>
          KontoPlaner
        </Link>
      </header>

      <nav
        aria-label="Hauptnavigation mobil"
        className="mobile-tabbar md:hidden fixed inset-x-0 bottom-0 z-50"
      >
        <ul className="mx-auto flex h-[var(--mobile-tabbar-height)] max-w-lg items-stretch px-2">
          {tabItems.map((item) => {
            const active = isActive(item.href) && !isOpen
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  aria-label={
                    item.badge > 0 && item.badgeLabel
                      ? `${tabLabels[item.href]}, ${item.badge} ${item.badgeLabel}`
                      : undefined
                  }
                  className={`flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium ${
                    active ? 'text-accent' : 'text-secondary'
                  }`}
                >
                  <span
                    className={`relative flex h-8 w-14 items-center justify-center rounded-pill transition-colors duration-feedback ${
                      active ? 'bg-accent-subtle' : ''
                    }`}
                  >
                    <item.icon className="h-6 w-6" aria-hidden="true" />
                    {item.badge > 0 && (
                      <span
                        className="absolute top-0 right-2 flex min-w-[1.125rem] h-[1.125rem] items-center justify-center rounded-full bg-pending px-1 text-[10px] font-semibold leading-none text-pending-foreground"
                        aria-hidden="true"
                      >
                        {formatBadgeCount(item.badge)}
                      </span>
                    )}
                  </span>
                  {tabLabels[item.href]}
                </Link>
              </li>
            )
          })}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              aria-expanded={isOpen}
              aria-controls="mobile-sidebar"
              aria-label={
                moreBadge > 0 ? `Mehr, ${moreBadge} offene Hinweise` : 'Mehr'
              }
              className={`flex h-full w-full flex-col items-center justify-center gap-1 text-[11px] font-medium active:!scale-100 ${
                moreActive ? 'text-accent' : 'text-secondary'
              }`}
            >
              <span
                className={`relative flex h-8 w-14 items-center justify-center rounded-pill transition-colors duration-feedback ${
                  moreActive ? 'bg-accent-subtle' : ''
                }`}
              >
                {isOpen ? (
                  <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                ) : (
                  <EllipsisHorizontalIcon className="h-6 w-6" aria-hidden="true" />
                )}
                {moreBadge > 0 && !isOpen && (
                  <span
                    className="absolute top-0 right-2 flex min-w-[1.125rem] h-[1.125rem] items-center justify-center rounded-full bg-pending px-1 text-[10px] font-semibold leading-none text-pending-foreground"
                    aria-hidden="true"
                  >
                    {formatBadgeCount(moreBadge)}
                  </span>
                )}
              </span>
              Mehr
            </button>
          </li>
        </ul>
      </nav>

      {!isCollapsed && (
        <div
          className="fixed inset-0 z-30 bg-black/40 hidden md:block"
          onClick={() => setIsCollapsed(true)}
        />
      )}

      <div
        id="mobile-sidebar"
        data-open={isOpen}
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-surface border-r border-hairline md:w-[var(--sidebar-width)] md:translate-x-0 mobile-nav-drawer max-md:top-14 max-md:h-[calc(100%-3.5rem)] max-md:pb-[var(--mobile-tabbar-space)] max-md:rounded-r-[1.5rem] ${
          isOpen
            ? 'max-md:translate-x-0 max-md:shadow-raised max-md:visible'
            : 'max-md:-translate-x-full max-md:shadow-none max-md:invisible'
        }`}
      >
        <div className="flex-1 overflow-x-hidden overflow-y-auto">
          <div
            className={`hidden md:flex h-16 shrink-0 items-center px-4 transition-[padding] duration-300 ease-in-out ${
              iconOnlyMode ? 'md:justify-center md:px-2' : 'justify-between'
            }`}
          >
            <Link
              href="/"
              className={`text-xl font-semibold text-primary tracking-tight ${labelTransition} ${
                showExpandedContent
                  ? 'max-w-[8rem] opacity-100'
                  : 'max-w-0 opacity-0 pointer-events-none'
              }`}
              tabIndex={showExpandedContent ? 0 : -1}
              aria-hidden={!showExpandedContent}
            >
              KontoPlaner
            </Link>
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`hidden md:flex shrink-0 items-center justify-center w-9 h-9 rounded-pill hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${
                isCollapsed ? '' : 'ml-auto'
              }`}
              aria-label={isCollapsed ? 'Menü ausklappen' : 'Menü einklappen'}
            >
              {isCollapsed ? (
                <ChevronRightIcon className="h-5 w-5 shrink-0 text-secondary" />
              ) : (
                <ChevronLeftIcon className="h-5 w-5 shrink-0 text-secondary" />
              )}
            </button>
          </div>

          <nav className="flex-1 px-2 space-y-1 py-4 max-md:pt-2">
            {navigation.map((item, index) => {
              const isActivePath = isActive(item.href)
              const showBadge = item.badge > 0
              const badgeAria =
                showBadge && item.badgeLabel
                  ? `${item.badge} ${item.badgeLabel}`
                  : undefined
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  title={iconOnlyMode ? item.name : undefined}
                  aria-label={
                    badgeAria ? `${item.name}, ${badgeAria}` : undefined
                  }
                  className={`${navItemClasses(isActivePath)}${
                    isOpen ? ' mobile-nav-item-in' : ''
                  }`}
                  style={
                    isOpen
                      ? ({ animationDelay: `${60 + index * 40}ms` } satisfies CSSProperties)
                      : undefined
                  }
                  onClick={() => setIsOpen(false)}
                >
                  <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                    <item.icon
                      className={`h-5 w-5 shrink-0 ${
                        isActivePath ? 'text-accent' : 'text-secondary'
                      }`}
                      aria-hidden="true"
                    />
                    {showBadge && iconOnlyMode && (
                      <span
                        className="absolute -top-1.5 -right-1.5 flex min-w-[1.125rem] h-[1.125rem] items-center justify-center rounded-full bg-pending px-1 text-[10px] font-semibold leading-none text-pending-foreground"
                        aria-hidden="true"
                      >
                        {formatBadgeCount(item.badge)}
                      </span>
                    )}
                  </span>
                  <span
                    className={`flex flex-1 items-center gap-2 text-sm font-medium ${labelTransition} ${labelVisibility}`}
                  >
                    <span className="truncate">{item.name}</span>
                    {showBadge && !iconOnlyMode && (
                      <span
                        className="ml-auto flex min-w-[1.125rem] h-[1.125rem] shrink-0 items-center justify-center rounded-full bg-pending px-1 text-[10px] font-semibold leading-none text-pending-foreground"
                        aria-hidden="true"
                      >
                        {formatBadgeCount(item.badge)}
                      </span>
                    )}
                  </span>
                </Link>
              )
            })}
          </nav>

          <div className="shrink-0 overflow-hidden">
            <AccountSwitcher
              showExpanded={showExpandedContent}
              iconOnlyMode={iconOnlyMode}
            />
          </div>

          <div className="px-2 py-2 space-y-2">
            {session && (
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                title={
                  iconOnlyMode
                    ? 'Ausloggen – Bestätigung erforderlich'
                    : 'Vom Konto abmelden'
                }
                aria-label="Ausloggen"
                className={`flex items-center w-full min-h-11 text-sm font-medium text-danger rounded-control hover:bg-danger-subtle transition-colors duration-feedback ${
                  iconOnlyMode ? 'md:justify-center md:px-2 py-2 px-3' : 'px-3 py-2'
                }${isOpen ? ' mobile-nav-item-in' : ''}`}
                style={
                  isOpen
                    ? ({ animationDelay: `${60 + navigation.length * 40}ms` } satisfies CSSProperties)
                    : undefined
                }
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                  <ArrowRightOnRectangleIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
                </span>
                <span className={`${labelTransition} ${labelVisibility}`}>Ausloggen</span>
              </button>
            )}
          </div>
        </div>

        <div
          className={`shrink-0 px-2 py-2 overflow-hidden transition-[border-color] duration-300 ${
            showExpandedContent ? 'border-t border-hairline' : ''
          }`}
        >
          <a
            href="https://github.com/kartoffelkaese/konto-planer/blob/main/CHANGELOG.md"
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center text-xs text-secondary hover:text-primary ${labelTransition} ${
              showExpandedContent
                ? 'max-w-full opacity-100 px-2 py-1'
                : 'max-w-0 opacity-0 h-0 py-0 pointer-events-none'
            }`}
            tabIndex={showExpandedContent ? 0 : -1}
            aria-hidden={!showExpandedContent}
          >
            Version {APP_VERSION}
          </a>
        </div>
      </div>

      <div
        className={`mobile-nav-backdrop fixed inset-0 top-14 z-[35] bg-black/30 backdrop-blur-[2px] md:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
        aria-hidden={!isOpen}
      />

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={async () => {
          try {
            await signOut({ redirect: false })
            router.push('/')
            router.refresh()
          } catch {
            showToast('Abmelden fehlgeschlagen. Bitte erneut versuchen.', 'error')
            throw new Error('signOut failed')
          }
        }}
        title="Abmelden?"
        message="Möchten Sie sich wirklich abmelden?"
        confirmText="Abmelden"
        cancelText="Abbrechen"
        type="warning"
      />
    </>
  )
}
