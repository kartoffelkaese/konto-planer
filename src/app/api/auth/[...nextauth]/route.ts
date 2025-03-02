import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

const handler = NextAuth(authOptions)

// Exportiere die Handler-Funktionen für die API-Route
export { handler as GET, handler as POST } 