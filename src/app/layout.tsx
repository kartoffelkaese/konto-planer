import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Navigation from '@/components/Navigation'
import { Providers } from './providers'
import '@/lib/initLogger'

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
            <Navigation />
          <main className="md:ml-[var(--sidebar-width)] transition-all duration-300">
              {children}
            </main>
        </Providers>
      </body>
    </html>
  )
}
