import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Navigation from '@/components/Navigation'
import AccountSwitchTransition from '@/components/AccountSwitchTransition'
import { Providers } from './providers'
import {
  COLOR_SCHEMES_JSON,
  DARK_COLOR_SCHEMES_JSON,
  DEFAULT_COLOR_SCHEME,
} from '@/lib/colorSchemes'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

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
    <html lang="de" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var v=${COLOR_SCHEMES_JSON};var dark=${DARK_COLOR_SCHEMES_JSON};var d='${DEFAULT_COLOR_SCHEME}';var s=localStorage.getItem('colorScheme');if(s==='ocean'){s='lagoon';localStorage.setItem('colorScheme','lagoon');}if(s==='twilight'){s=d;localStorage.setItem('colorScheme',d);}var scheme=v.indexOf(s)>=0?s:d;document.documentElement.setAttribute('data-color-scheme',scheme);document.documentElement.classList.toggle('dark',dark.indexOf(scheme)>=0);document.documentElement.classList.remove('light');})();`,
          }}
        />
      </head>
      <body className={`${inter.variable} ${inter.className} antialiased`}>
        <Providers>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-1/2 focus:-translate-x-1/2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-control focus:bg-accent focus:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
          >
            Zum Inhalt springen
          </a>
          <Navigation />
          <main
            id="main-content"
            tabIndex={-1}
            className="md:ml-[var(--sidebar-width)] transition-[margin-left] duration-300 ease-in-out outline-none"
          >
            <AccountSwitchTransition>{children}</AccountSwitchTransition>
          </main>
        </Providers>
      </body>
    </html>
  )
}
