import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const token = req.auth
  const pathname = req.nextUrl.pathname

  // Wenn keine Session vorhanden ist und nicht auf einer Auth-Seite oder der Landing Page
  if (!token && !pathname.startsWith('/auth/') && pathname !== '/') {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Wenn Session vorhanden und auf Auth-Seite
  if (token && pathname.startsWith('/auth/')) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
})

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

