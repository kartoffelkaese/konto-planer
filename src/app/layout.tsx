import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Navigation from '@/components/Navigation'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Konto-Planer',
  description: 'Verwalten Sie Ihre Ein- und Ausgaben',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen bg-gray-50">
            <Navigation />
            <main className="md:ml-[var(--sidebar-width)] transition-all duration-300 ease-in-out pt-16 md:pt-0">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  )
}
