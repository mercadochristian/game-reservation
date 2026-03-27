import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { logError } from '@/lib/logger'

const PUBLIC_ROUTES = ['/auth', '/auth/callback', '/', '/api/registrations/counts', '/api/registrations/by-position']

// Exempt from profile-completion redirect: the API that completes the profile
// and the page itself (prevents a redirect loop).
const PROFILE_CHECK_EXEMPT = ['/api/profile/complete', '/create-profile']

type Role = 'admin' | 'super_admin' | 'facilitator' | 'player'

// Dashboard sub-paths restricted to specific roles.
// Paths not listed here are accessible to all authenticated users (e.g. /dashboard itself).
const ROLE_PROTECTED_PAGES: Record<string, Role[]> = {
  '/dashboard/users': ['admin', 'super_admin'],
  '/dashboard/registrations': ['admin', 'super_admin'],
  '/dashboard/payments': ['admin', 'super_admin'],
  '/dashboard/schedules': ['admin', 'super_admin'],
  '/dashboard/locations': ['admin', 'super_admin'],
  '/dashboard/payment-channels': ['admin', 'super_admin'],
  '/dashboard/logs': ['super_admin'],
  '/dashboard/lineups': ['admin', 'super_admin'],
  // '/dashboard/scanner': ['facilitator'],
  // '/dashboard/teams': ['facilitator'],
  // '/dashboard/mvp': ['facilitator'],
  // '/dashboard/register': ['player'],
  // '/dashboard/my-registrations': ['player'],
}

// Copies Supabase session cookies onto any redirect response so session
// refresh tokens are not lost when the middleware redirects.
function redirectWithSession(
  url: string,
  request: NextRequest,
  supabaseResponse: NextResponse,
): NextResponse {
  const dest = request.nextUrl.clone()
  dest.href = url
  const response = NextResponse.redirect(dest)
  supabaseResponse.cookies.getAll().forEach(c => response.cookies.set(c))
  return response
}

export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl

    // Must call updateSession before any early return to keep session cookies fresh
    const { supabaseResponse, user, supabase } = await updateSession(request)

    // S1: Static assets
    if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
      return supabaseResponse
    }

    const isPublicRoute = PUBLIC_ROUTES.some(route =>
      route === '/' ? pathname === '/' : pathname.startsWith(route),
    )
    const isProfileCheckExempt = PROFILE_CHECK_EXEMPT.some(route =>
      pathname.startsWith(route),
    )

    // S2/S3: Unauthenticated user
    if (!user) {
      if (isPublicRoute) return supabaseResponse

      const loginUrl = new URL('/auth', request.url)
      loginUrl.searchParams.set('returnUrl', pathname)
      return redirectWithSession(loginUrl.toString(), request, supabaseResponse)
    }

    // Authenticated: always fetch fresh profile data from DB
    const { data } = await supabase
      .from('users')
      .select('role, profile_completed')
      .eq('id', user.id)
      .single() as { data: { role: string; profile_completed: boolean } | null }

    const role = data?.role ?? 'player'
    const profileCompleted = data?.profile_completed ?? false

    // S5/S6: Profile incomplete
    if (!profileCompleted) {
      if (isProfileCheckExempt) return supabaseResponse

      const dest = new URL('/create-profile', request.url)
      dest.searchParams.set('returnUrl', pathname)
      return redirectWithSession(dest.toString(), request, supabaseResponse)
    }

    // Profile complete from here on

    // S4: Authenticated, visiting /auth — redirect to intended destination
    if (pathname.startsWith('/auth')) {
      const rawReturnUrl =
        request.nextUrl.searchParams.get('returnUrl') ?? '/dashboard'
      const returnUrl = rawReturnUrl.startsWith('/auth')
        ? '/dashboard'
        : rawReturnUrl
      return redirectWithSession(
        new URL(returnUrl, request.url).toString(),
        request,
        supabaseResponse,
      )
    }

    // S7: Public route (e.g. `/`) — pass through
    if (isPublicRoute) return supabaseResponse

    // S8: Check role-protected dashboard pages
    const protectedEntry = Object.entries(ROLE_PROTECTED_PAGES).find(([path]) =>
      pathname.startsWith(path),
    )
    if (protectedEntry) {
      const [, allowedRoles] = protectedEntry
      if (!allowedRoles.includes(role as Role)) {
        return redirectWithSession(
          new URL('/dashboard', request.url).toString(),
          request,
          supabaseResponse,
        )
      }
    }

    // S9: Correct path — pass through
    return supabaseResponse
  } catch (err) {
    // Log the error but don't break middleware — pass through to allow the request to continue
    void logError('middleware.unhandled', err)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
