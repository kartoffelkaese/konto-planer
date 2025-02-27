import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    // Wenn der Benutzer eingeloggt ist und versucht, auf /auth/* zuzugreifen
    if (req.nextUrl.pathname.startsWith('/auth/') && req.nextauth.token) {
      return NextResponse.redirect(new URL('/transactions', req.url))
    }
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Erlaube Zugriff auf /auth/* ohne Token
        if (req.nextUrl.pathname.startsWith('/auth/')) {
          return true
        }
        // Für alle anderen Routen wird ein Token benötigt
        return !!token
      },
    },
  }
)

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
} 