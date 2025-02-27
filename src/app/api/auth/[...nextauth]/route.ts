import NextAuth, { AuthOptions, Session } from 'next-auth'
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
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            throw new Error('Bitte E-Mail und Passwort eingeben')
          }

          const user = await prisma.user.findUnique({
            where: { email: credentials.email.toLowerCase() }
          })

          if (!user || !user.passwordHash) {
            console.log('Benutzer nicht gefunden oder kein Passwort-Hash:', credentials.email)
            throw new Error('Ungültige Anmeldedaten')
          }

          const isValid = await bcrypt.compare(credentials.password, user.passwordHash)

          if (!isValid) {
            console.log('Ungültiges Passwort für Benutzer:', credentials.email)
            throw new Error('Ungültige Anmeldedaten')
          }

          console.log('Erfolgreiche Anmeldung für:', credentials.email)
          return {
            id: user.id,
            email: user.email,
            name: user.accountName
          }
        } catch (error) {
          console.error('Authentifizierungsfehler:', error)
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
    }
  },
  debug: process.env.NODE_ENV === 'development'
}

const handler = NextAuth(authOptions)

// Exportiere die Handler-Funktionen für die API-Route
export { handler as GET, handler as POST } 