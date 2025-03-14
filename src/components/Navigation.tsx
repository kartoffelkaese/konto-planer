'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  HomeIcon, 
  ChartBarIcon, 
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

export default function Navigation() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(true)

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', isCollapsed ? '4rem' : '16rem')
  }, [isCollapsed])

  const navigation = [
    { name: 'Dashboard', href: '/', icon: HomeIcon },
    { name: 'Transaktionen', href: '/transactions', icon: ChartBarIcon },
    { name: 'Wiederkehrend', href: '/recurring', icon: ArrowPathIcon },
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
          className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
        >
          <span className="sr-only">Menü öffnen</span>
          {isOpen ? (
            <XMarkIcon className="h-6 w-6" aria-hidden="true" />
          ) : (
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          )}
        </button>
        {isOpen && (
          <div className="mt-4">
            <Link href="/" className="text-xl font-bold text-blue-600">
              KontoPlaner
            </Link>
          </div>
        )}
      </div>

      {/* Desktop Overlay */}
      {!isCollapsed && (
        <div 
          className="fixed inset-0 z-30 bg-gray-600 bg-opacity-75 hidden md:block"
          onClick={() => setIsCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 bg-white shadow-lg transform transition-all duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0 ${isOpen ? 'w-64' : 'w-[var(--sidebar-width)]'} flex flex-col`}>
        <div className="flex-1 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b">
            {!isCollapsed && (
              <Link href="/" className="text-xl font-bold text-blue-600">
                KontoPlaner
              </Link>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              {isCollapsed ? (
                <ChevronRightIcon className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronLeftIcon className="h-5 w-5 text-gray-500" />
              )}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className={`flex-1 px-2 space-y-1 ${isOpen ? 'py-12' : 'py-4'}`}>
            {navigation.map((item) => {
              const isActivePath = isActive(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-150 ${
                    isActivePath
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <item.icon
                    className={`h-5 w-5 ${
                      isActivePath ? 'text-blue-700' : 'text-gray-400'
                    }`}
                    aria-hidden="true"
                  />
                  {(isOpen || !isCollapsed) && (
                    <span className="ml-3">{item.name}</span>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Logout Button */}
          <div className="px-2 py-2">
            <button
              onClick={() => signOut()}
              className="flex items-center w-full px-4 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 hover:text-red-700 transition-colors duration-150"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
              {(isOpen || !isCollapsed) && (
                <span className="ml-3">Ausloggen</span>
              )}
            </button>
          </div>
        </div>

        {/* Version */}
        <div className={`px-4 py-2 ${(isOpen || !isCollapsed) ? 'border-t' : ''}`}>
          {(isOpen || !isCollapsed) && (
            <a
              href="https://github.com/kartoffelkaese/konto-planer/blob/main/CHANGELOG.md"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-start text-xs text-gray-500 hover:text-gray-700"
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