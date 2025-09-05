import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAuth = !!token
    const isAuthPage = req.nextUrl.pathname.startsWith('/auth')
    const isApiRoute = req.nextUrl.pathname.startsWith('/api')

    // Redirect authenticated users away from auth pages
    if (isAuth && isAuthPage) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // Allow access to auth pages and NextAuth API routes
    if (isAuthPage || req.nextUrl.pathname.startsWith('/api/auth')) {
      return NextResponse.next()
    }

    // Protect all other routes
    if (!isAuth && !isApiRoute) {
      return NextResponse.redirect(new URL('/auth/signin', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl

        // Allow access to auth pages and NextAuth API routes
        if (pathname.startsWith('/auth') || pathname.startsWith('/api/auth')) {
          return true
        }

        // Require authentication for all other routes
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files with extensions
     * - API routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api/).*)',
  ],
}
