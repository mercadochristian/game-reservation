import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import {
  readProfileCache,
  writeProfileCache,
  type ProfileData,
} from '@/lib/middleware/profile-cache'

const PUBLIC_ROUTES = ['/auth', '/auth/callback', '/']

// Exempt from profile-completion redirect: the API that completes the profile
// and the page itself (prevents a redirect loop).
const PROFILE_CHECK_EXEMPT = ['/api/profile/complete', '/create-profile']

const ROLE_PATH_MAP: Record<string, string> = {
  admin: '/admin',
  super_admin: '/admin',
  facilitator: '/facilitator',
  player: '/player',
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

  // Authenticated: try cache, fall back to DB
  let profile = readProfileCache(request)
  if (!profile) {
    const { data } = await supabase
      .from('users')
      .select('role, profile_completed')
      .eq('id', user.id)
      .single() as { data: { role: string; profile_completed: boolean } | null }
    profile = {
      role: data?.role ?? 'player',
      profile_completed: data?.profile_completed ?? false,
    } satisfies ProfileData
    writeProfileCache(supabaseResponse, profile)
  }

  const { role, profile_completed: profileCompleted } = profile

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

  // S8: On a role-prefixed path that belongs to a different role
  const allowedPrefix = ROLE_PATH_MAP[role]
  const isOnARolePath = Object.values(ROLE_PATH_MAP).some(p =>
    pathname.startsWith(p),
  )
  const isOnWrongRolePath =
    isOnARolePath &&
    (!allowedPrefix || !pathname.startsWith(allowedPrefix))

  if (isOnWrongRolePath) {
    return redirectWithSession(
      new URL('/dashboard', request.url).toString(),
      request,
      supabaseResponse,
    )
  }

  // S9: Correct path — pass through
  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
