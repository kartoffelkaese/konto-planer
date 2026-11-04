import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import Navigation from '@/components/Navigation'
import AccountSwitchTransition from '@/components/AccountSwitchTransition'
import PlanBanner from '@/components/PlanBanner'
import KeptAccountDialog from '@/components/KeptAccountDialog'
import { Providers } from './providers'
import { THEME_INIT_SCRIPT } from '@/lib/colorSchemes'
import { SIDEBAR_INIT_SCRIPT } from '@/lib/sidebarLayout'
import { COLOR_SCHEME_TOKENS } from '@/lib/colorSchemeTokens'
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_OG_ALT,
  SITE_OG_IMAGE_HEIGHT,
  SITE_OG_IMAGE_WIDTH,
  SITE_TITLE,
  getOgImageUrl,
  getSiteUrl,
} from '@/lib/siteMetadata'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: 'website',
    locale: 'de_DE',
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: getOgImageUrl(),
        width: SITE_OG_IMAGE_WIDTH,
        height: SITE_OG_IMAGE_HEIGHT,
        alt: SITE_OG_ALT,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [getOgImageUrl()],
  },
  robots: {
    index: true,
    follow: true,
  },
  // Installiert auf dem iPhone: ohne Safari-Leisten starten, Statusleiste über dem Inhalt
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: 'default',
  },
}

export const viewport: Viewport = {
  // Nötig, damit env(safe-area-inset-*) im App-Modus die echten Abstände liefert
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: COLOR_SCHEME_TOKENS.light.canvas },
    { media: '(prefers-color-scheme: dark)', color: COLOR_SCHEME_TOKENS.dark.canvas },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" suppressHydrationWarning className="scroll-smooth" data-scroll-behavior="smooth">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: THEME_INIT_SCRIPT + SIDEBAR_INIT_SCRIPT,
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
            className="md:ml-[var(--sidebar-width)] main-beside-sidebar max-md:pb-[var(--mobile-tabbar-space,0px)] outline-none"
          >
            <PlanBanner />
            <KeptAccountDialog />
            <AccountSwitchTransition>{children}</AccountSwitchTransition>
          </main>
        </Providers>
      </body>
    </html>
  )
}
