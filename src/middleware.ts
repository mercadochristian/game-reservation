import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Auth guard: URLs listed here bypass authentication.
// All other routes require a valid session.
const PUBLIC_ROUTES = ['/auth', '/auth/callback', '/']

// Routes that bypass profile completion check (e.g., the endpoint that completes the profile)
const PROFILE_CHECK_EXEMPT = ['/api/profile/complete']

// Role-to-path prefix mapping
const ROLE_PATH_MAP: Record<string, string> = {
  admin: '/admin',
  super_admin: '/admin',
  facilitator: '/facilitator',
  player: '/player',
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always run updateSession to refresh the session cookie
  const { supabaseResponse, user, supabase } = await updateSession(request)

  // Allow public routes and static assets through
  const isPublicRoute = PUBLIC_ROUTES.some(route =>
    route === '/' ? pathname === '/' : pathname.startsWith(route)
  )
  const isStaticAsset = pathname.startsWith('/_next') || pathname.startsWith('/favicon')

  if (isStaticAsset) {
    return supabaseResponse
  }

  // Unauthenticated user accessing protected route
  if (!user && !isPublicRoute) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/auth'
    loginUrl.searchParams.set('returnUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Fetch profile once for all authenticated-user checks below
  let profileRole: string | null = null
  let profileCompleted: boolean | null = null

  if (user && (isPublicRoute || !isPublicRoute)) {
    const { data: profile } = await supabase
      .from('users')
      .select('role, profile_completed')
      .eq('id', user.id)
      .single()

    profileRole = (profile as { role: string; profile_completed: boolean } | null)?.role ?? 'player'
    profileCompleted = (profile as { role: string; profile_completed: boolean } | null)?.profile_completed ?? false
  }

  // Authenticated user accessing /auth — redirect to their dashboard or create-profile
  if (user && isPublicRoute && pathname === '/auth') {
    const completed = profileCompleted ?? false
    const returnUrl = request.nextUrl.searchParams.get('returnUrl')

    // All users who haven't completed profile creation go there first
    if (!completed) {
      const createProfileUrl = request.nextUrl.clone()
      createProfileUrl.pathname = '/create-profile'
      if (returnUrl) {
        createProfileUrl.searchParams.set('returnUrl', returnUrl)
      }
      return NextResponse.redirect(createProfileUrl)
    }

    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = returnUrl || '/dashboard'
    return NextResponse.redirect(dashboardUrl)
  }

  // Authenticated user accessing a role-restricted path
  if (user && !isPublicRoute) {
    const role = profileRole ?? 'player'
    const completed = profileCompleted ?? false
    const isProfileCheckExempt = PROFILE_CHECK_EXEMPT.some(route => pathname.startsWith(route))

    // Redirect all users who haven't completed profile creation (except exempt routes)
    if (!completed && pathname !== '/create-profile' && !isProfileCheckExempt) {
      const createProfileUrl = request.nextUrl.clone()
      createProfileUrl.pathname = '/create-profile'
      createProfileUrl.searchParams.set('returnUrl', pathname)
      return NextResponse.redirect(createProfileUrl)
    }

    // Check if user is on a path they're not allowed to access (skip /dashboard as it's role-agnostic)
    const allowedPrefix = ROLE_PATH_MAP[role]
    const isOnWrongRolePath = !allowedPrefix || !pathname.startsWith(allowedPrefix) &&
      Object.values(ROLE_PATH_MAP).some(prefix => pathname.startsWith(prefix))

    if (isOnWrongRolePath) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/dashboard'
      return NextResponse.redirect(redirectUrl)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - Public file extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
