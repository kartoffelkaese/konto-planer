import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Navigation from '@/components/Navigation'
import { Providers } from './providers'

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
            __html: `(function(){var v=['nebel','twilight'];var s=localStorage.getItem('colorScheme');document.documentElement.setAttribute('data-color-scheme',v.indexOf(s)>=0?s:'nebel');document.documentElement.classList.remove('dark','light');})();`,
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
            {children}
          </main>
        </Providers>
      </body>
    </html>
  )
}
