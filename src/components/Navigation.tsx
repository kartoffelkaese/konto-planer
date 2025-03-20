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
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'
import { APP_VERSION } from '@/lib/version'
import { signOut } from 'next-auth/react'
import ThemeSwitcher from './ThemeSwitcher'

export default function Navigation() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    document.documentElement.style.setProperty('--sidebar-width', isCollapsed ? '4rem' : '16rem')
  }, [isCollapsed])

  // Verhindere Hydration Mismatch
  if (!isMounted) {
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

  return (
    <>
      {/* Mobile menu button and title */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
        >
          <span className="sr-only">Menü öffnen</span>
          {isOpen ? (
            <XMarkIcon className="h-6 w-6" aria-hidden="true" />
          ) : (
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Desktop Overlay */}
      {!isCollapsed && (
        <div 
          className="fixed inset-0 z-30 bg-gray-600 bg-opacity-75 hidden md:block"
          onClick={() => setIsCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 bg-white dark:bg-dark-light shadow-lg transform transition-all duration-300 ease-in-out ${
        isOpen ? 'translate-x-0 w-64' : '-translate-x-full'
      } md:translate-x-0 w-[var(--sidebar-width)] flex flex-col`}>
        <div className="flex-1 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b dark:border-dark-lighter mt-16 md:mt-0">
            {!isCollapsed && (
              <Link href="/" className="text-xl font-bold text-blue-600 dark:text-blue-400">
                KontoPlaner
              </Link>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-lighter focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              {isCollapsed ? (
                <ChevronRightIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              ) : (
                <ChevronLeftIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              )}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-2 space-y-1 py-4">
            {navigation.map((item) => {
              const isActivePath = isActive(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-150 ${
                    isActivePath
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-lighter hover:text-gray-900 dark:hover:text-white'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <item.icon
                    className={`h-5 w-5 ${
                      isActivePath ? 'text-blue-700 dark:text-blue-300' : 'text-gray-400 dark:text-gray-500'
                    }`}
                    aria-hidden="true"
                  />
                  {!isCollapsed && (
                    <span className="ml-3">{item.name}</span>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Logout Button */}
          <div className="px-2 py-2 space-y-2">
            {session && (
              <button
                onClick={() => signOut()}
                className="flex items-center w-full px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300 transition-colors duration-150"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5 text-red-400 dark:text-red-500" aria-hidden="true" />
                {!isCollapsed && (
                  <span className="ml-3">Ausloggen</span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Version */}
        <div className={`px-4 py-2 ${!isCollapsed ? 'border-t dark:border-dark-lighter' : ''}`}>
          {!isCollapsed && (
            <a
              href="https://github.com/kartoffelkaese/konto-planer/blob/main/CHANGELOG.md"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-start text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Version {APP_VERSION}
            </a>
          )}
        </div>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-30 bg-gray-600 bg-opacity-75 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
} 