import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Auth guard: URLs listed here bypass authentication.
// All other routes require a valid session.
const PUBLIC_ROUTES = ['/auth', '/auth/callback']

// Role-to-path prefix mapping
const ROLE_PATH_MAP: Record<string, string> = {
  admin: '/admin',
  facilitator: '/facilitator',
  player: '/player',
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always run updateSession to refresh the session cookie
  const { supabaseResponse, user, supabase } = await updateSession(request)

  // Allow public routes and static assets through
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route))
  const isStaticAsset = pathname.startsWith('/_next') || pathname.startsWith('/favicon')

  if (isStaticAsset) {
    return supabaseResponse
  }

  // Unauthenticated user accessing protected route
  if (!user && !isPublicRoute) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/auth'
    return NextResponse.redirect(loginUrl)
  }

  // Authenticated user accessing /auth — redirect to their dashboard or create-profile
  if (user && isPublicRoute && pathname === '/auth') {
    const { data: profile } = await supabase
      .from('users')
      .select('role, profile_completed')
      .eq('id', user.id)
      .single()

    const role = (profile as any)?.role ?? 'player'
    const profileCompleted = (profile as any)?.profile_completed ?? false

    // Players who haven't completed profile creation go there first
    if (role === 'player' && !profileCompleted) {
      const createProfileUrl = request.nextUrl.clone()
      createProfileUrl.pathname = '/create-profile'
      return NextResponse.redirect(createProfileUrl)
    }

    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = ROLE_PATH_MAP[role] ?? '/player'
    return NextResponse.redirect(dashboardUrl)
  }

  // Authenticated user accessing a role-restricted path
  if (user && !isPublicRoute) {
    const { data: profile } = await supabase
      .from('users')
      .select('role, profile_completed')
      .eq('id', user.id)
      .single()

    const role = (profile as any)?.role ?? 'player'
    const profileCompleted = (profile as any)?.profile_completed ?? false

    // Redirect players who haven't completed profile creation
    if (role === 'player' && !profileCompleted && pathname !== '/create-profile') {
      const createProfileUrl = request.nextUrl.clone()
      createProfileUrl.pathname = '/create-profile'
      return NextResponse.redirect(createProfileUrl)
    }

    const allowedPrefix = ROLE_PATH_MAP[role]

    // Check if user is on a path they're not allowed to access
    const isOnWrongRolePath = Object.entries(ROLE_PATH_MAP).some(
      ([r, prefix]) => r !== role && pathname.startsWith(prefix)
    )

    if (isOnWrongRolePath) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = allowedPrefix ?? '/player'
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
