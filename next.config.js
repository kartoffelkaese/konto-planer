const fs = require('fs')
const path = require('path')

/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === 'production'

const baseSecurityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
]

/**
 * CSP nur in Produktion – in Dev blockiert sie RSC/HMR/Turbopack.
 * script-src bleibt bei 'unsafe-inline': Next.js schreibt die Seitendaten als Inline-Skripte;
 * ohne 'unsafe-inline' bräuchte es pro Anfrage einen Nonce, und alle Seiten würden dynamisch
 * gerendert (bewusst nicht gewählt, siehe Sicherheitsbericht S10).
 */
function buildConnectSrc() {
  const sources = new Set(["'self'"])
  const authUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL
  if (authUrl) {
    try {
      sources.add(new URL(authUrl).origin)
    } catch {
      // Ungültige URL ignorieren
    }
  }
  return [...sources].join(' ')
}

const productionSecurityHeaders = [
  ...baseSecurityHeaders,
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src " + buildConnectSrc(),
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "manifest-src 'self'",
      "worker-src 'self'",
      'upgrade-insecure-requests',
    ].join('; '),
  },
]

const securityHeaders = isProduction
  ? productionSecurityHeaders
  : baseSecurityHeaders

const nextConfig = {
  reactStrictMode: true,
  // Einzige Quelle der Versionsnummer ist package.json; nur dieser eine Wert landet im Client-Bundle
  env: {
    NEXT_PUBLIC_APP_VERSION: require('./package.json').version,
    // Für Seiten ohne Anmeldung (Startseite, Registrierung): Sind Benutzerlevel aktiv?
    // Wird beim Build eingesetzt – nach einer Änderung von PLANS_ENABLED neu bauen.
    NEXT_PUBLIC_PLANS_ENABLED: process.env.PLANS_ENABLED === 'true' ? 'true' : '',
    // „Komplett“ ist buchbar (Level aktiv und Stripe vollständig eingerichtet)
    NEXT_PUBLIC_BILLING_ENABLED:
      process.env.PLANS_ENABLED === 'true' &&
      ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PRICE_MONTHLY', 'STRIPE_PRICE_YEARLY'].every(
        (key) => Boolean(process.env[key])
      )
        ? 'true'
        : '',
    // Vorhandene Rechtstexte (content/legal/<slug>.md) – nur diese Seiten werden verlinkt
    NEXT_PUBLIC_LEGAL_PAGES: ['impressum', 'datenschutz', 'agb', 'widerruf']
      .filter((slug) => {
        try {
          return fs.readFileSync(path.join(__dirname, 'content', 'legal', `${slug}.md`), 'utf8').trim() !== ''
        } catch {
          return false
        }
      })
      .join(','),
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

module.exports = nextConfig
