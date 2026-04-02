import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RegistrationsClient } from '@/components/registrations/registrations-client'
import type { Location } from '@/types'

interface RegistrationsPageProps {
  readonly searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function RegistrationsPage({ searchParams }: RegistrationsPageProps) {
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
    .single() as { data: { role: string } | null; error: any }

  const userRole = (userProfile?.role || 'player') as string

  // Only admins can access (enforced by middleware and page)
  if (userRole !== 'admin' && userRole !== 'super_admin') {
    redirect('/dashboard')
  }

  // Fetch locations
  const { data: locations } = await supabase
    .from('locations')
    .select('id, name, address, google_map_url')
    .order('name')

  const params = await searchParams

  return (
    <RegistrationsClient locations={(locations || []) as Location[]} userRole={'admin'} initialSearchParams={params} />
  )
}
