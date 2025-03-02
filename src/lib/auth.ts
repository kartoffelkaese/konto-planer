import { AuthOptions, Session } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { JWT } from 'next-auth/jwt'

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'E-Mail', type: 'email' },
        password: { label: 'Passwort', type: 'password' }
      },
      async authorize(credentials, req) {
        try {
          // Sicherheitscheck: Keine Anmeldedaten in der URL erlauben
          const referer = req.headers?.referer
          if (referer && (referer.includes('email=') || referer.includes('password='))) {
            return null
          }

          if (!credentials?.email || !credentials?.password) {
            throw new Error('Bitte E-Mail und Passwort eingeben')
          }

          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          })

          if (!user?.passwordHash) {
            return null
          }

          const isValid = await bcrypt.compare(
            credentials.password,
            user.passwordHash
          )

          if (!isValid) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.accountName
          }
        } catch (error) {
          throw error
        }
      }
    })
  ],
  session: {
    strategy: 'jwt' as const
  },
  pages: {
    signIn: '/auth/login',
    newUser: '/auth/register',
    error: '/auth/error'
  },
  callbacks: {
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.id = token.sub as string
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // Wenn es ein Signout ist, immer zur Login-Seite
      if (url.includes('signout')) {
        return `${baseUrl}/auth/login`
      }
      // Sonst normale Redirect-Logik
      return url.startsWith(baseUrl) ? url : baseUrl
    }
  },
  events: {
    async signOut() {}
  },
  debug: false
} 