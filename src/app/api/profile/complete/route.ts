import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { onboardingSchema } from '@/lib/validations/profile'
import { logActivity, logError } from '@/lib/logger'
import type { UserRole } from '@/types'

type UserProfileRow = {
  profile_completed: boolean
  role: UserRole
}

export async function POST(request: NextRequest) {
  // 1. Authenticate the caller with the normal (anon) server client
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Check profile_completed status and get user's role
  const { data: profile } = await supabase
    .from('users')
    .select('profile_completed, role')
    .eq('id', user.id)
    .single() as { data: UserProfileRow | null; error: unknown }

  if (profile?.profile_completed) {
    return NextResponse.json({ error: 'Profile already completed' }, { status: 403 })
  }

  // 3. Validate body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = onboardingSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 422 })
  }

  const {
    first_name,
    last_name,
    birthday_month,
    birthday_day,
    birthday_year,
    gender,
    player_contact_number,
    emergency_contact_name,
    emergency_contact_relationship,
    emergency_contact_number,
    skill_level,
  } = result.data

  // 4. Update with service client (bypasses RLS)
  const serviceClient = createServiceClient()
  const { error: updateError } = await (serviceClient
    .from('users') as any)
    .update({
      first_name,
      last_name,
      birthday_month,
      birthday_day,
      birthday_year: birthday_year ?? null,
      gender,
      player_contact_number,
      emergency_contact_name,
      emergency_contact_relationship,
      emergency_contact_number,
      skill_level,
      profile_completed: true,
    })
    .eq('id', user.id)

  if (updateError) {
    void logError('profile.complete', updateError, user.id)
    return NextResponse.json({ error: 'Failed to save profile. Please try again.' }, { status: 500 })
  }

  void logActivity('profile.complete', user.id, { role: profile?.role, skill_level })
  return NextResponse.json({ success: true, role: profile?.role ?? 'player' })
}
