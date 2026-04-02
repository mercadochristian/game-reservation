import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { profileEditSchema } from '@/lib/validations/profile-edit'
import { logActivity, logError } from '@/lib/logger'
import { updateUserProfile } from '@/lib/queries'

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = profileEditSchema.safeParse(body)

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
  } = result.data

  const serviceClient = createServiceClient()
  const { error: updateError } = await updateUserProfile(serviceClient, user.id, {
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
  })

  if (updateError) {
    void logError('profile.edit', updateError, user.id)
    return NextResponse.json({ error: 'Failed to update profile. Please try again.' }, { status: 500 })
  }

  void logActivity('profile.edit', user.id)
  return NextResponse.json({ success: true })
}
