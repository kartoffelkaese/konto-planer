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
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ArrowLeftStartOnRectangleIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline'
import { APP_VERSION } from '@/lib/version'
import { signOut } from 'next-auth/react'
import ConfirmDialog from '@/components/ConfirmDialog'
import AccountSwitcher from '@/components/AccountSwitcher'
import { useToast } from '@/hooks/useToast'
import { useUserSettings } from '@/hooks/useUserSettings'
import { getNavBadges } from '@/lib/api'
import {
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
  readSidebarCollapsed,
  storeSidebarState,
} from '@/lib/sidebarLayout'

const badgeClass =
  'flex min-w-[1.125rem] h-[1.125rem] items-center justify-center rounded-full bg-pending px-1 text-[10px] font-semibold leading-none text-pending-foreground'

function formatBadgeCount(count: number): string {
  if (count > 99) return '99+'
  return String(count)
}

/** Position im „Mehr“-Sheet für das versetzte Einblenden (siehe .mobile-sheet-item) */
function sheetItemStyle(index: number): CSSProperties {
  return { '--sheet-item-index': index } as CSSProperties
}

export default function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const { showToast } = useToast()
  const { isSimpleAccount } = useUserSettings()
  const [isOpen, setIsOpen] = useState(false)
  // Desktop-Leiste: gespeicherter Zustand (Standard: ausgeklappt)
  const [isCollapsed, setIsCollapsed] = useState(readSidebarCollapsed)
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
      // Nach dem Abmelden startet die Landing-Page ohne Leiste
      if (session === null) storeSidebarState(false, isCollapsed)
      return
    }
    storeSidebarState(true, isCollapsed)
    root.setProperty(
      '--sidebar-width',
      isCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED
    )
    root.setProperty(
      '--mobile-tabbar-space',
      'calc(var(--mobile-tabbar-height) + env(safe-area-inset-bottom, 0px))'
    )
  }, [session, isCollapsed])

  useEffect(() => {
    if (!session) return

    const loadBadges = async () => {
      try {
        const data = await getNavBadges<{
          unconfirmedTransactions?: number
          recurringAttention?: number
          pendingInvitations?: number
          pendingSplitInvitations?: number
        }>()
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
    { name: 'Übersicht', href: '/', icon: HomeIcon, badge: 0 },
    {
      name: 'Buchungen',
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

  /** Mobile Tab-Leiste: Hauptziele direkt, Rest im „Mehr“-Sheet */
  const tabHrefs = ['/', '/transactions', '/split']
  const tabItems = navigation.filter((item) => tabHrefs.includes(item.href))
  const moreItems = navigation.filter((item) => !tabHrefs.includes(item.href))
  const moreBadge = moreItems.reduce((sum, item) => sum + item.badge, 0)
  const moreActive = isOpen || moreItems.some((item) => isActive(item.href))

  const badgeAriaLabel = (item: (typeof navigation)[number]) =>
    item.badge > 0 && item.badgeLabel
      ? `${item.name}, ${item.badge} ${item.badgeLabel}`
      : undefined

  const toggleCollapsed = () => setIsCollapsed((value) => !value)

  return (
    <>
      {/* ---------- Mobil: Kopfzeile ---------- */}
      <header className="md:hidden sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-hairline bg-canvas/85 px-4 backdrop-blur-md">
        <Link
          href="/"
          className="flex min-h-11 items-center gap-2 text-lg font-semibold tracking-tight text-primary truncate"
          onClick={() => setIsOpen(false)}
        >
          <LogoMark />
          KontoPlaner
        </Link>
      </header>

      {/* ---------- Desktop: Seitenleiste ---------- */}
      <aside
        // Icons behalten in beiden Zuständen ihre Position; nur die Beschriftungen (.sidebar-label) blenden ein/aus.
        // Kein overflow-hidden: die Tooltips der eingeklappten Leiste ragen über den Rand.
        className="desktop-sidebar hidden md:flex fixed inset-y-0 left-0 z-40 w-[var(--sidebar-width)] flex-col border-r border-hairline bg-surface"
        aria-label="Hauptnavigation"
        data-collapsed={isCollapsed}
      >
        <div className="flex h-16 shrink-0 items-center overflow-hidden px-5">
          <Link
            href="/"
            className="flex min-h-11 items-center gap-2.5 text-lg font-semibold tracking-tight text-primary whitespace-nowrap"
            aria-label="KontoPlaner – Übersicht"
          >
            <LogoMark />
            <span className="sidebar-label">KontoPlaner</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {navigation.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                aria-label={badgeAriaLabel(item)}
                className={`nav-tooltip-anchor group relative flex min-h-11 items-center gap-3 rounded-control px-3.5 text-sm font-medium transition-colors duration-feedback ${
                  active
                    ? 'bg-accent-subtle text-accent font-semibold'
                    : 'text-secondary hover:bg-surface-muted hover:text-primary'
                }`}
              >
                <span className="relative flex shrink-0">
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                  {item.badge > 0 && isCollapsed && (
                    <span className={`absolute -top-1.5 -right-2 ${badgeClass}`} aria-hidden="true">
                      {formatBadgeCount(item.badge)}
                    </span>
                  )}
                </span>
                <span className="sidebar-label min-w-0 flex-1 truncate">{item.name}</span>
                {item.badge > 0 && (
                  <span className={`sidebar-label ${badgeClass}`} aria-hidden="true">
                    {formatBadgeCount(item.badge)}
                  </span>
                )}
                {isCollapsed && (
                  <span className="nav-tooltip" aria-hidden="true">
                    {item.name}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="shrink-0 space-y-1 border-t border-hairline p-3">
          <AccountSwitcher variant={isCollapsed ? 'rail' : 'sidebar'} />

          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            aria-label="Abmelden"
            className="nav-tooltip-anchor group relative flex min-h-11 w-full items-center gap-3 rounded-control px-3.5 text-sm font-medium text-secondary transition-colors duration-feedback hover:bg-danger-subtle hover:text-danger"
          >
            <ArrowLeftStartOnRectangleIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="sidebar-label min-w-0 flex-1 truncate text-left">Abmelden</span>
            {isCollapsed && (
              <span className="nav-tooltip" aria-hidden="true">
                Abmelden
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={isCollapsed ? 'Seitenleiste ausklappen' : 'Seitenleiste einklappen'}
            aria-expanded={!isCollapsed}
            className="nav-tooltip-anchor group relative flex min-h-11 w-full items-center gap-3 rounded-control px-3.5 text-sm font-medium text-secondary transition-colors duration-feedback hover:bg-surface-muted hover:text-primary"
          >
            <ChevronDoubleLeftIcon className="sidebar-toggle-icon h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="sidebar-label flex min-w-0 flex-1 items-center justify-between gap-2 overflow-hidden whitespace-nowrap">
              Einklappen
              <a
                href="https://github.com/kartoffelkaese/konto-planer/blob/main/CHANGELOG.md"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-xs font-normal text-secondary/80 hover:text-primary"
              >
                v{APP_VERSION}
              </a>
            </span>
            {isCollapsed && (
              <span className="nav-tooltip" aria-hidden="true">
                Ausklappen
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* ---------- Mobil: Tab-Leiste ---------- */}
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
                  aria-label={badgeAriaLabel(item)}
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
                      <span className={`absolute top-0 right-2 ${badgeClass}`} aria-hidden="true">
                        {formatBadgeCount(item.badge)}
                      </span>
                    )}
                  </span>
                  {item.name}
                </Link>
              </li>
            )
          })}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              aria-expanded={isOpen}
              aria-controls="mobile-more-sheet"
              aria-label={
                moreBadge > 0 ? `Mehr, ${moreBadge} offene Hinweise` : 'Mehr'
              }
              className={`flex h-full w-full flex-col items-center justify-center gap-1 text-[11px] font-medium active:!scale-100 ${
                moreActive ? 'text-accent' : 'text-secondary'
              }`}
            >
              <span
                data-open={isOpen}
                className={`more-pill relative flex h-8 w-14 items-center justify-center rounded-pill ${
                  moreActive ? 'bg-accent-subtle' : ''
                }`}
              >
                <EllipsisHorizontalIcon className="more-icon-dots h-6 w-6" aria-hidden="true" />
                <XMarkIcon className="more-icon-close absolute h-6 w-6" aria-hidden="true" />
                {moreBadge > 0 && !isOpen && (
                  <span className={`absolute top-0 right-2 ${badgeClass}`} aria-hidden="true">
                    {formatBadgeCount(moreBadge)}
                  </span>
                )}
              </span>
              Mehr
            </button>
          </li>
        </ul>
      </nav>

      {/* ---------- Mobil: „Mehr“ als Bottom-Sheet ---------- */}
      <div
        className={`mobile-sheet-backdrop md:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />
      <div
        id="mobile-more-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Weitere Bereiche"
        data-open={isOpen}
        className={`mobile-sheet md:hidden fixed inset-x-0 z-[45] bottom-[var(--mobile-tabbar-space)] max-h-[calc(100dvh-var(--mobile-tabbar-space)-4rem)] overflow-y-auto overscroll-contain rounded-t-[1.5rem] border-t border-hairline bg-surface-raised px-3 pb-3 shadow-raised ${
          isOpen ? 'translate-y-0 visible' : 'translate-y-[calc(100%+var(--mobile-tabbar-space))] invisible'
        }`}
      >
        <div className="mx-auto mt-2.5 mb-2 h-1 w-10 rounded-full bg-border/60" aria-hidden="true" />

        <ul className="space-y-0.5">
          {moreItems.map((item, index) => {
            const active = isActive(item.href)
            return (
              <li key={item.href} className="mobile-sheet-item" style={sheetItemStyle(index)}>
                <Link
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  aria-label={badgeAriaLabel(item)}
                  className={`flex min-h-12 items-center gap-3 rounded-control px-3 text-[15px] font-medium transition-colors duration-feedback ${
                    active ? 'bg-accent-subtle text-accent' : 'text-primary hover:bg-surface-muted'
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      active ? 'bg-accent text-accent-foreground' : 'bg-surface-muted text-secondary'
                    }`}
                  >
                    <item.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.name}</span>
                  {item.badge > 0 && (
                    <span className={badgeClass} aria-hidden="true">
                      {formatBadgeCount(item.badge)}
                    </span>
                  )}
                  <ChevronRightIcon className="h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="mobile-sheet-item" style={sheetItemStyle(moreItems.length)}>
          <SheetAccountSection />
        </div>

        <div
          className="mobile-sheet-item mt-2 flex items-center justify-between gap-2 border-t border-hairline px-1 pt-2"
          style={sheetItemStyle(moreItems.length + 1)}
        >
          <button
            type="button"
            onClick={() => {
              setIsOpen(false)
              setShowLogoutConfirm(true)
            }}
            className="flex min-h-11 items-center gap-2 rounded-control px-2 text-sm font-medium text-danger hover:bg-danger-subtle"
          >
            <ArrowLeftStartOnRectangleIcon className="h-5 w-5" aria-hidden="true" />
            Abmelden
          </button>
          <a
            href="https://github.com/kartoffelkaese/konto-planer/blob/main/CHANGELOG.md"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center px-2 text-xs text-secondary hover:text-primary"
          >
            Version {APP_VERSION}
          </a>
        </div>
      </div>

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

function LogoMark() {
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.65rem] bg-accent text-sm font-bold text-accent-foreground"
      aria-hidden="true"
    >
      K
    </span>
  )
}

/** Konto-Abschnitt im mobilen Sheet – erscheint nur bei mehreren Konten */
function SheetAccountSection() {
  return (
    <div className="mt-2 border-t border-hairline pt-2 empty:hidden [&:not(:has(button))]:hidden">
      <p className="eyebrow px-3 pb-1">Konto</p>
      <AccountSwitcher variant="sheet" />
    </div>
  )
}
