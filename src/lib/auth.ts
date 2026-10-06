import NextAuth from 'next-auth'
import { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { assertProductionEnv } from '@/lib/env'
import {
  checkRateLimit,
  getClientIp,
  loginRateLimitKey,
  RATE_LIMITS,
} from '@/lib/rate-limit'
import { getFirstAccountIdForUser, userHasAccountAccess } from '@/lib/accounts'
import { logger } from '@/lib/logger'
import { hashPassword, needsRehash } from '@/lib/password-hash'

/** In Dev: Produktions-URL aus .env entfernen, lokale AUTH_URL setzen (für Redirects/API). */
function configureAuthUrlForDev() {
  if (process.env.NODE_ENV === 'production') return

  for (const key of ['AUTH_URL', 'NEXTAUTH_URL'] as const) {
    const value = process.env[key]
    if (!value) continue
    try {
      const host = new URL(value).hostname
      if (host === 'konto-planer.de' || host === 'www.konto-planer.de') {
        delete process.env[key]
      }
    } catch {
      delete process.env[key]
    }
  }

  const existing = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL
  if (existing) {
    try {
      new URL(existing)
      return
    } catch {
      delete process.env.AUTH_URL
      delete process.env.NEXTAUTH_URL
    }
  }

  const port = process.env.PORT ?? '3000'
  process.env.AUTH_URL = `http://localhost:${port}`
}

configureAuthUrlForDev()
assertProductionEnv()

const isProduction = process.env.NODE_ENV === 'production'

/** bcrypt-Hash eines zufälligen, nirgends verwendeten Passworts (Kostenfaktor 10 wie die ältesten Hashes) */
const DUMMY_PASSWORD_HASH = '$2b$10$SryR/xVHInuswL1rh0dphedXRA0AbXceLlYUrFUL.h0jVj0QDACIW'

/**
 * Hinter Reverse-Proxy (nginx/Caddy): Host-Header von AUTH_URL vertrauen.
 * Deaktivieren nur mit AUTH_TRUST_HOST=false (selten nötig).
 */
function shouldTrustHost(): boolean {
  if (!isProduction) return true
  if (process.env.AUTH_TRUST_HOST === 'false') return false
  if (process.env.AUTH_TRUST_HOST === 'true') return true
  return !!(process.env.AUTH_URL || process.env.NEXTAUTH_URL)
}

export const authConfig: NextAuthConfig = {
  trustHost: shouldTrustHost(),
  adapter: PrismaAdapter(prisma),
  useSecureCookies: isProduction,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'E-Mail', type: 'email' },
        password: { label: 'Passwort', type: 'password' },
      },
      async authorize(credentials, request) {
        try {
          if (!credentials?.email || !credentials?.password) {
            throw new Error('Bitte E-Mail und Passwort eingeben')
          }

          const email = credentials.email as string
          const ip = request?.headers
            ? getClientIp(request.headers)
            : 'direct'
          const { allowed } = checkRateLimit(
            loginRateLimitKey(ip, email),
            RATE_LIMITS.login
          )
          if (!allowed) {
            return null
          }

          const user = await prisma.user.findUnique({
            where: { email },
          })

          // Auch ohne Nutzer einen Hash vergleichen, damit die Antwortzeit nicht verrät,
          // ob die E-Mail registriert ist
          const isValid = await bcrypt.compare(
            credentials.password as string,
            user?.passwordHash || DUMMY_PASSWORD_HASH
          )

          if (!user?.passwordHash) {
            return null
          }

          if (!isValid) {
            return null
          }

          if (!user.emailVerified) {
            throw new Error('EMAIL_NOT_VERIFIED')
          }

          // Ältere Hashes unauffällig auf den aktuellen Kostenfaktor anheben
          if (needsRehash(user.passwordHash)) {
            try {
              await prisma.user.update({
                where: { id: user.id },
                data: { passwordHash: await hashPassword(credentials.password as string) },
              })
            } catch (rehashError) {
              logger.error('Passwort-Hash konnte nicht angehoben werden', rehashError, { endpoint: '/api/auth' })
            }
          }

          // Zeitpunkt der Anmeldung für die Verwaltung – ein Fehler dabei verhindert den Login nicht
          try {
            await prisma.user.update({
              where: { id: user.id },
              data: { lastLoginAt: new Date() },
            })
          } catch (lastLoginError) {
            logger.error('Letzte Anmeldung konnte nicht gespeichert werden', lastLoginError, { endpoint: '/api/auth' })
          }

          const firstAccountId = await getFirstAccountIdForUser(user.id)

          return {
            id: user.id,
            email: user.email,
            name: user.email,
            activeAccountId: firstAccountId ?? undefined,
            sessionVersion: user.sessionVersion,
          }
        } catch (error) {
          if (
            error instanceof Error &&
            error.message === 'EMAIL_NOT_VERIFIED'
          ) {
            throw error
          }
          logger.error('Auth error', error, { endpoint: '/api/auth' })
          return null
        }
      },
    }),
  ],
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const u = user as { id: string; activeAccountId?: string; sessionVersion?: number }
        token.sub = u.id
        token.sessionVersion = u.sessionVersion ?? 0
        if (u.activeAccountId) {
          token.activeAccountId = u.activeAccountId
        } else if (u.id) {
          const first = await getFirstAccountIdForUser(u.id)
          if (first) token.activeAccountId = first
        }
      }

      if (trigger === 'update' && session?.activeAccountId && token.sub) {
        const accountId = session.activeAccountId as string
        const allowed = await userHasAccountAccess(token.sub, accountId)
        if (allowed) {
          token.activeAccountId = accountId
        }
      }

      // Nach eigenem Passwortwechsel: diese Sitzung auf die neue Version heben (alle anderen enden)
      if (trigger === 'update' && session?.refreshSessionVersion && token.sub) {
        const current = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { sessionVersion: true },
        })
        if (current) token.sessionVersion = current.sessionVersion
      }

      return token
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
      }
      if (token.activeAccountId) {
        session.activeAccountId = token.activeAccountId as string
      }
      session.sessionVersion = token.sessionVersion ?? 0
      return session
    },
    async redirect({ url, baseUrl }) {
      if (url.includes('signout')) {
        try {
          const signOutUrl = new URL(url, baseUrl)
          const callbackUrl = signOutUrl.searchParams.get('callbackUrl')
          if (callbackUrl) {
            const target = new URL(callbackUrl, baseUrl)
            if (target.origin === new URL(baseUrl).origin) {
              return target.href
            }
          }
        } catch {
          // Fallback unten
        }
        return `${baseUrl}/`
      }
      try {
        const target = new URL(url, baseUrl)
        const base = new URL(baseUrl)
        if (target.origin !== base.origin) {
          return baseUrl
        }
        return target.href
      } catch {
        return baseUrl
      }
    },
  },
  debug: false,
}

export const { auth, handlers, signIn, signOut } = NextAuth(authConfig)
