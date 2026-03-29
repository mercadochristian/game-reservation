import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RegistrationsMergedClient } from '@/components/registrations/registrations-merged-client'

export default async function RegistrationsPage() {
  const supabase = await createClient()

  // Get current user session
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/auth')
  }

  // Get user profile to check role
  const { data: userProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .single()

  const userRole = (userProfile?.role || 'player') as 'admin' | 'facilitator' | 'player'

  // Only admin and facilitator can access
  if (userRole === 'player') {
    redirect('/dashboard')
  }

  // Fetch locations
  const { data: locations } = await supabase
    .from('locations')
    .select('id, name, address, google_map_url')
    .order('name')

  return (
    <RegistrationsMergedClient locations={locations || []} userRole={userRole} />
  )
}
