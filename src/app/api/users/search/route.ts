import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/types/database'
import { userSearchSchema } from '@/lib/validations/user-search'
import { logError } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const raw = request.nextUrl.searchParams.get('q')?.trim() ?? ''

    const parsed = userSearchSchema.safeParse({ q: raw })
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid search query' },
        { status: 400 }
      )
    }

    const { q } = parsed.data

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // ignored - cookies can't be set in GET requests
            }
          },
        },
      }
    )

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Search for users by first name, last name, or email
    // Exclude guest accounts from search results (can't be selected as existing players)
    const { data: users, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, skill_level')
      .eq('is_guest', false)
      .or(
        `first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`
      )
      .limit(10)

    if (error) {
      console.error('User search error:', error)
      void logError('users.search.query', error, user?.id, { query: q })
      return NextResponse.json({ error: 'Search failed' }, { status: 500 })
    }

    return NextResponse.json(users || [])
  } catch (err) {
    console.error('User search exception:', err)
    void logError('users.search.unhandled', err instanceof Error ? err : new Error(String(err)))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
