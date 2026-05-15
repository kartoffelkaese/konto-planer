import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { isPublicApiPath } from '@/lib/public-api'

export default auth((req) => {
  const token = req.auth
  const pathname = req.nextUrl.pathname

  if (pathname.startsWith('/api/')) {
    if (isPublicApiPath(pathname)) {
      return NextResponse.next()
    }
    if (!token) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }
    return NextResponse.next()
  }

  if (!token && !pathname.startsWith('/auth/') && pathname !== '/') {
    return NextResponse.redirect(new URL('/', req.url))
  }

  if (token && pathname.startsWith('/auth/')) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
