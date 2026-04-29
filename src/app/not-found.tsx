import Link from 'next/link'
import { HomeIcon, BanknotesIcon } from '@heroicons/react/24/outline'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-50">
      <div className="text-center p-8">
        <div className="relative">
          <BanknotesIcon className="absolute -top-8 -left-8 h-24 w-24 text-blue-200 transform -rotate-12" />
          <h1 className="text-9xl font-bold text-blue-600 relative z-10">404</h1>
          <BanknotesIcon className="absolute -bottom-8 -right-8 h-24 w-24 text-blue-200 transform rotate-12" />
        </div>
        <h2 className="mt-8 text-2xl font-semibold text-gray-900">Seite nicht gefunden</h2>
        <p className="mt-2 text-gray-600 max-w-md mx-auto">
          Die angeforderte Seite konnte leider nicht gefunden werden. 
          Vielleicht wurde sie in den falschen Ordner gelegt?
        </p>
        <div className="mt-8 space-y-4">
          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
          >
            <HomeIcon className="h-5 w-5 mr-2" />
            Zur Startseite
          </Link>
          <p className="text-sm text-gray-500">
            KontoPlaner - Ihre Finanzen im Griff
          </p>
        </div>
      </div>
    </div>
  )
} 