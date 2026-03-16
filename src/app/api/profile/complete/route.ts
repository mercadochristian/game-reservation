import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { onboardingSchema } from '@/lib/validations/profile'

export async function POST(request: NextRequest) {
  // 1. Authenticate the caller with the normal (anon) server client
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Check profile_completed status
  const { data: profile } = await supabase
    .from('users')
    .select('profile_completed')
    .eq('id', user.id)
    .single()

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
    birthday_month,
    birthday_day,
    birthday_year,
    gender,
    emergency_contact_name,
    emergency_contact_relationship,
    emergency_contact_number,
    skill_level,
  } = result.data

  // 4. Update with service client (bypasses RLS)
  const serviceClient = createServiceClient()
  const { error: updateError } = await serviceClient
    .from('users')
    .update({
      birthday_month,
      birthday_day,
      birthday_year: birthday_year ?? null,
      gender,
      emergency_contact_name,
      emergency_contact_relationship,
      emergency_contact_number,
      skill_level,
      profile_completed: true,
    })
    .eq('id', user.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
