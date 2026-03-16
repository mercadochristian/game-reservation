import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // First, set on the request (so the current handler sees fresh cookies)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Rebuild response to carry updated request
          supabaseResponse = NextResponse.next({ request })
          // Then set on the response (so the browser receives the new cookies)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do not run any logic between createServerClient and getUser().
  // A subtle bug: if anything causes an early return before getUser() is called,
  // the session refresh may not fire, leading to stale sessions.
  const { data: { user } } = await supabase.auth.getUser()

  return { supabaseResponse, user, supabase }
}
