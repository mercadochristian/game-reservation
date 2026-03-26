import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { User } from '@/types'

/**
 * Returns the authenticated user's full profile row, or null if unauthenticated.
 * Uses the server client (cookie-based auth) for identity verification, then
 * fetches the full users row via the service client.
 * Designed for use in React Server Components.
 */
export async function getCurrentUser(): Promise<User | null> {
  const serverClient = await createClient()
  const {
    data: { user: authUser },
  } = await serverClient.auth.getUser()
  if (!authUser) return null

  const serviceClient = createServiceClient()
  const { data } = await serviceClient
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle()

  return data ?? null
}
