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

assertProductionEnv()

const isProduction = process.env.NODE_ENV === 'production'

export const authConfig: NextAuthConfig = {
  trustHost: isProduction ? !!process.env.AUTH_TRUST_HOST : true,
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

          if (!user?.passwordHash) {
            return null
          }

          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.passwordHash
          )

          if (!isValid) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.accountName,
          }
        } catch (error) {
          console.error('Auth error:', error)
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
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      if (url.includes('signout')) {
        return `${baseUrl}/auth/login`
      }
      try {
        const target = new URL(url, baseUrl)
        const base = new URL(baseUrl)
        if (target.origin !== base.origin) {
          return baseUrl
        }
        return target.pathname + target.search
      } catch {
        return baseUrl
      }
    },
  },
  debug: false,
}

export const { auth, handlers, signIn, signOut } = NextAuth(authConfig)
