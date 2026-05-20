import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isPublicApiPath } from '@/lib/public-api'

/** RSC/Soft-Navigation – Redirect würde den Flight-Fetch abbrechen. */
function isRscOrPrefetchRequest(req: NextRequest): boolean {
  return (
    req.headers.get('RSC') === '1' ||
    req.headers.get('Next-Router-Prefetch') === '1' ||
    req.headers.has('Next-Router-State-Tree') ||
    (req.headers.get('Accept')?.includes('text/x-component') ?? false)
  )
}

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
    if (isRscOrPrefetchRequest(req)) {
      return NextResponse.next()
    }
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Eingeloggte Nutzer dürfen /auth/login sehen (wichtig direkt nach signOut)
  if (token && pathname.startsWith('/auth/register')) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
