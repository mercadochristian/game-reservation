import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Fetches the role of a user by ID.
 * Used by API routes for authorization checks.
 */
export async function getUserRole(supabase: SupabaseClient, userId: string) {
  return (supabase.from('users') as any)
    .select('role')
    .eq('id', userId)
    .single() as { data: { role: string } | null; error: any }
}

/**
 * Fetches the full profile row for a user by ID.
 * Used by get-current-user.ts and profile operations.
 */
export async function getUserProfile(supabase: SupabaseClient, userId: string) {
  return supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
}

/**
 * Verifies a user exists by fetching their ID only.
 * Used to validate player IDs in registration flows.
 */
export async function getUserById(supabase: SupabaseClient, userId: string) {
  return supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .single()
}

/**
 * Fetches multiple users by their IDs.
 * Used in registrations and scanner player lookups.
 */
export async function getUsersByIds(supabase: SupabaseClient, ids: string[]) {
  return (supabase.from('users') as any)
    .select('id, first_name, last_name, email, skill_level, is_guest')
    .in('id', ids) as {
    data: Array<{
      id: string
      first_name: string | null
      last_name: string | null
      email: string
      skill_level: string | null
      is_guest: boolean
    }> | null
    error: any
  }
}

/**
 * Searches non-guest users by name or email (max 10 results).
 * Used by the user search API endpoint.
 */
export async function searchUsers(supabase: SupabaseClient, query: string) {
  return supabase
    .from('users')
    .select('id, first_name, last_name, email, skill_level')
    .eq('is_guest', false)
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(10)
}

/**
 * Updates a user's profile fields.
 * Used by profile/complete, profile/edit, and users/[userId] API routes.
 */
export async function updateUserProfile(
  supabase: SupabaseClient,
  userId: string,
  data: Record<string, unknown>,
) {
  return (supabase.from('users') as any)
    .update(data)
    .eq('id', userId)
}

/**
 * Fetches the first_name of a user.
 * Used for naming teams during registration.
 */
export async function getUserFirstName(supabase: SupabaseClient, userId: string) {
  return (supabase.from('users') as any)
    .select('first_name')
    .eq('id', userId)
    .single() as { data: { first_name: string | null } | null; error: any }
}

/**
 * Fetches all users ordered by creation date.
 * Used by the admin users dashboard (browser client).
 */
export async function getAllUsers(supabase: SupabaseClient) {
  return (supabase.from('users') as any)
    .select(
      'id, first_name, last_name, email, role, skill_level, player_contact_number, emergency_contact_name, emergency_contact_relationship, emergency_contact_number, is_guest, created_at',
    )
    .order('created_at', { ascending: false })
}
