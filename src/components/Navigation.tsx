'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useState } from 'react'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import { APP_VERSION } from '@/lib/version'

export default function Navigation() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const router = useRouter()

  const isActive = (path: string) => {
    return pathname === path
  }

  const handleSignOut = async () => {
    try {
      const data = await signOut({ 
        redirect: false
      })
      router.push('/auth/login')
    } catch (error) {
      console.error('Fehler beim Logout:', error)
    }
  }

  // Wenn nicht eingeloggt und nicht auf Login/Register-Seite, zeige keine Navigation
  if (!session && !pathname?.startsWith('/auth/')) {
    return null
  }

  // Wenn auf Login/Register-Seite, zeige minimale Navigation
  if (pathname?.startsWith('/auth/')) {
    return (
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <div className="relative">
                  <h1 className="text-2xl font-bold text-gray-900">Konto-Planer</h1>
                  <span className="absolute bottom-0.5 left-full ml-2 text-[10px] text-gray-400">v{APP_VERSION}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <div className="relative">
                <h1 className="text-2xl font-bold text-gray-900">Konto-Planer</h1>
                <span className="absolute bottom-0.5 left-full ml-2 text-[10px] text-gray-400">v{APP_VERSION}</span>
              </div>
            </div>
            <div className="hidden sm:ml-10 sm:flex sm:space-x-4">
              <Link
                href="/transactions"
                className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-150 ${
                  isActive('/transactions')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Übersicht
              </Link>
              <Link
                href="/recurring"
                className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-150 ${
                  isActive('/recurring')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Wiederkehrend
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            {/* Mobile menu button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="sm:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <span className="sr-only">Menü öffnen</span>
              {showMobileMenu ? (
                <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>

            {/* Desktop user menu */}
            <div className="hidden sm:ml-3 sm:flex sm:items-center">
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-150 focus:outline-none"
                >
                  <span className="font-medium">{session?.user?.email}</span>
                  <svg
                    className={`h-5 w-5 transition-transform duration-150 ${
                      showUserMenu ? 'transform rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 py-1 z-50">
                    <Link
                      href="/settings"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                      role="menuitem"
                      onClick={() => setShowUserMenu(false)}
                    >
                      Kontoeinstellungen
                    </Link>
                    <Link
                      href="/settings/merchants"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                      role="menuitem"
                      onClick={() => setShowUserMenu(false)}
                    >
                      Händler verwalten
                    </Link>
                    <Link
                      href="/settings/categories"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                      role="menuitem"
                      onClick={() => setShowUserMenu(false)}
                    >
                      Kategorien verwalten
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                      role="menuitem"
                    >
                      Abmelden
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`${showMobileMenu ? 'block' : 'hidden'} sm:hidden`}>
        <div className="pt-2 pb-3 space-y-1 border-t border-gray-200">
          <Link
            href="/transactions"
            className={`block px-4 py-2 text-base font-medium transition-colors duration-150 ${
              isActive('/transactions')
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            }`}
            onClick={() => setShowMobileMenu(false)}
          >
            Übersicht
          </Link>
          <Link
            href="/recurring"
            className={`block px-4 py-2 text-base font-medium transition-colors duration-150 ${
              isActive('/recurring')
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            }`}
            onClick={() => setShowMobileMenu(false)}
          >
            Wiederkehrend
          </Link>
        </div>
        <div className="pt-4 pb-3 border-t border-gray-200">
          <div className="px-4 py-2">
            <div className="text-base font-medium text-gray-800">{session?.user?.email}</div>
          </div>
          <div className="mt-3 space-y-1">
            <Link
              href="/settings"
              className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              onClick={() => setShowMobileMenu(false)}
            >
              Kontoeinstellungen
            </Link>
            <Link
              href="/settings/merchants"
              className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              onClick={() => setShowMobileMenu(false)}
            >
              Händler verwalten
            </Link>
            <Link
              href="/settings/categories"
              className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              onClick={() => setShowMobileMenu(false)}
            >
              Kategorien verwalten
            </Link>
            <button
              onClick={() => {
                handleSignOut()
                setShowMobileMenu(false)
              }}
              className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            >
              Abmelden
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
} 