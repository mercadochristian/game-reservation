import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/types/database'
import type { UserRole } from '@/types'

type UserProfileRow = {
  role: UserRole
  profile_completed: boolean
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Fetch the user's role and profile completion status
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('role, profile_completed')
          .eq('id', user.id)
          .single() as { data: UserProfileRow | null; error: unknown }

        const role = profile?.role ?? 'player'
        const profileCompleted = profile?.profile_completed ?? false

        // Players who haven't completed profile creation go there first
        if (role === 'player' && !profileCompleted) {
          return NextResponse.redirect(`${origin}/create-profile`)
        }

        // Redirect to homepage
        return NextResponse.redirect(`${origin}/`)
      }
    }
  }

  // Auth failed — redirect to auth page with error
  return NextResponse.redirect(`${origin}/auth?error=auth_callback_failed`)
}
