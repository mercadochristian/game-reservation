import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { logError } from '@/lib/logger'

const PUBLIC_ROUTES = ['/auth', '/auth/callback', '/', '/waiver', '/api/registrations/counts', '/api/registrations/by-position']

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
  '/dashboard/scanner': ['admin', 'super_admin', 'facilitator'],
  // '/dashboard/teams': ['facilitator'],
  // '/dashboard/mvp': ['facilitator'],
  // '/dashboard/register': ['player'],
  // '/dashboard/my-registrations': ['player'],
}

// ─── Rate limiting ──────────────────────────────────────────────────────────────
// In-memory sliding window rate limiter.
// Limitation: resets on cold starts — each serverless instance has its own store.
// This stops naive abuse; distributed attacks require an external store (e.g., Redis).

const rateLimitStore = new Map<string, number[]>()

const RATE_LIMIT_RULES = [
  { prefix: '/api/register/',      limit: 5,  windowMs: 60_000 },
  { prefix: '/api/admin/register', limit: 10, windowMs: 60_000 },
  { prefix: '/api/payment-proof/', limit: 5,  windowMs: 60_000 },
] as const

function checkRateLimit(
  ip: string,
  pathname: string,
): { limited: boolean; retryAfter: number } {
  const rule = RATE_LIMIT_RULES.find((r) => pathname.startsWith(r.prefix))
  if (!rule) return { limited: false, retryAfter: 0 }

  const key = `${ip}:${rule.prefix}`
  const now = Date.now()
  const windowStart = now - rule.windowMs

  const timestamps = (rateLimitStore.get(key) ?? []).filter((t) => t > windowStart)

  if (timestamps.length >= rule.limit) {
    const retryAfter = Math.ceil((timestamps[0] + rule.windowMs - now) / 1000)
    return { limited: true, retryAfter: Math.max(retryAfter, 1) }
  }

  timestamps.push(now)
  rateLimitStore.set(key, timestamps)
  return { limited: false, retryAfter: 0 }
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

    // Rate limiting — runs before session refresh to block abuse before any DB round-trips
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      request.headers.get('x-real-ip') ??
      '127.0.0.1'

    const { limited, retryAfter } = checkRateLimit(ip, pathname)
    if (limited) {
      return new NextResponse(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
        },
      })
    }

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
    const { data, error } = await supabase
      .from('users')
      .select('role, profile_completed, banned_at')
      .eq('id', user.id)
      .single() as { data: { role: string; profile_completed: boolean; banned_at: string | null } | null; error: any }

    if (error) {
      void logError('middleware.profile_query_failed', error)
      // If profile query fails, treat as incomplete to be safe
      if (!PROFILE_CHECK_EXEMPT.some(route => pathname.startsWith(route))) {
        const dest = new URL('/create-profile', request.url)
        dest.searchParams.set('returnUrl', pathname)
        return redirectWithSession(dest.toString(), request, supabaseResponse)
      }
    }

    const role = data?.role ?? 'player'
    // profile_completed could be null (legacy data) or false — treat both as incomplete
    const profileCompleted = data?.profile_completed === true

    // S5a: Banned user — redirect to auth with error message
    if (data?.banned_at) {
      if (pathname.startsWith('/auth')) return supabaseResponse
      return redirectWithSession(
        new URL('/auth?error=banned', request.url).toString(),
        request,
        supabaseResponse,
      )
    }

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
      // Validate redirect is safe (internal path, not protocol-relative or absolute)
      const isSafeRedirect = (url: string): boolean =>
        url.startsWith('/') && !url.startsWith('//')
      const returnUrl = rawReturnUrl.startsWith('/auth') || !isSafeRedirect(rawReturnUrl)
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
    // Fail closed on unhandled errors (auth bypass prevention)
    void logError('middleware.unhandled', err)
    return NextResponse.redirect(new URL('/auth?error=service_unavailable', request.url))
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
