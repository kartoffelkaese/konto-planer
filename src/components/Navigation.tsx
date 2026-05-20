'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  HomeIcon,
  ChartPieIcon,
  BanknotesIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TagIcon,
  BuildingStorefrontIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline'
import { APP_VERSION } from '@/lib/version'
import { signOut } from 'next-auth/react'
import ConfirmDialog from '@/components/ConfirmDialog'
import { useToast } from '@/hooks/useToast'

const labelTransition =
  'overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin] duration-300 ease-in-out'

export default function Navigation() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { showToast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  useEffect(() => {
    if (!session) {
      document.documentElement.style.setProperty('--sidebar-width', '0')
      return
    }
    document.documentElement.style.setProperty(
      '--sidebar-width',
      isCollapsed ? '4rem' : '16rem'
    )
  }, [session, isCollapsed])

  if (!session) {
    return null
  }

  const navigation = [
    { name: 'Dashboard', href: '/', icon: HomeIcon },
    { name: 'Transaktionen', href: '/transactions', icon: BanknotesIcon },
    { name: 'Wiederkehrend', href: '/recurring', icon: ArrowPathIcon },
    { name: 'Statistiken', href: '/statistics', icon: ChartPieIcon },
    { name: 'Kategorien', href: '/settings/categories', icon: TagIcon },
    { name: 'Händler', href: '/settings/merchants', icon: BuildingStorefrontIcon },
    { name: 'Einstellungen', href: '/settings', icon: Cog6ToothIcon },
  ]

  const isActive = (path: string) => pathname === path

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

    const base = `flex items-center min-h-10 rounded-control transition-colors duration-feedback ${layout}`

    if (active) {
      if (iconOnlyMode) {
        return `${base} bg-accent-subtle text-accent font-semibold`
      }
      return `${base} bg-accent-subtle text-accent border-l-[3px] border-l-accent font-semibold`
    }

    return `${base} text-secondary hover:bg-accent-muted hover:text-accent border-l-[3px] border-l-transparent`
  }

  return (
    <>
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-control text-secondary hover:text-primary hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent"
        >
          <span className="sr-only">Menü öffnen</span>
          {isOpen ? (
            <XMarkIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
          ) : (
            <Bars3Icon className="h-6 w-6 shrink-0" aria-hidden="true" />
          )}
        </button>
      </div>

      {!isCollapsed && (
        <div
          className="fixed inset-0 z-30 bg-black/40 hidden md:block"
          onClick={() => setIsCollapsed(true)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-surface border-r-2 border-r-accent shadow-sm transition-[transform,width] duration-300 ease-in-out md:w-[var(--sidebar-width)] md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex-1 overflow-x-hidden overflow-y-auto">
          <div
            className={`flex h-16 shrink-0 items-center border-b border-accent-border bg-accent-muted px-4 mt-16 md:mt-0 transition-[padding] duration-300 ease-in-out ${
              iconOnlyMode ? 'md:justify-center md:px-2' : 'justify-between'
            }`}
          >
            <Link
              href="/"
              className={`text-xl font-semibold text-accent tracking-tight ${labelTransition} ${
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
              className={`hidden md:flex shrink-0 items-center justify-center w-8 h-8 rounded-control hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent ${
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

          <nav className="flex-1 px-2 space-y-1 py-4">
            {navigation.map((item) => {
              const isActivePath = isActive(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  title={iconOnlyMode ? item.name : undefined}
                  className={navItemClasses(isActivePath)}
                  onClick={() => setIsOpen(false)}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                    <item.icon
                      className={`h-5 w-5 shrink-0 ${
                        isActivePath ? 'text-accent' : 'text-secondary'
                      }`}
                      aria-hidden="true"
                    />
                  </span>
                  <span className={`text-sm font-medium ${labelTransition} ${labelVisibility}`}>
                    {item.name}
                  </span>
                </Link>
              )
            })}
          </nav>

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
                className={`flex items-center w-full min-h-10 text-sm font-medium text-danger rounded-control hover:bg-danger-subtle transition-colors duration-feedback ${
                  iconOnlyMode ? 'md:justify-center md:px-2 py-2 px-3' : 'px-3 py-2'
                }`}
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
            showExpandedContent ? 'border-t border-border' : ''
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

      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={async () => {
          try {
            await signOut({ callbackUrl: '/auth/login', redirect: true })
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
