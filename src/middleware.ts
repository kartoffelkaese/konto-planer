import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    // Wenn keine Session vorhanden ist und nicht auf einer Auth-Seite
    if (!req.nextauth.token && !req.nextUrl.pathname.startsWith('/auth/')) {
      return NextResponse.redirect(new URL('/auth/login', req.url))
    }

    // Wenn Session vorhanden und auf Auth-Seite
    if (req.nextauth.token && req.nextUrl.pathname.startsWith('/auth/')) {
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

// Konfiguriere die Pfade, für die die Middleware ausgeführt werden soll
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
} 