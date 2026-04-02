import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type DbClient = SupabaseClient<Database>

/**
 * Fetches the role of a user by ID.
 * Used by API routes for authorization checks.
 */
export async function getUserRole(supabase: DbClient, userId: string) {
  return supabase.from('users')
    .select('role')
    .eq('id', userId)
    .single()
}

/**
 * Verifies a user exists by fetching their ID only.
 * Used to validate player IDs in registration flows.
 */
export async function getUserById(supabase: DbClient, userId: string) {
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
export async function getUsersByIds(supabase: DbClient, ids: string[]) {
  return supabase.from('users')
    .select('id, first_name, last_name, email, skill_level, is_guest')
    .in('id', ids)
}

/**
 * Searches non-guest users by name or email (max 10 results).
 * Used by the user search API endpoint.
 */
export async function searchUsers(supabase: DbClient, query: string) {
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
  supabase: DbClient,
  userId: string,
  data: Database['public']['Tables']['users']['Update'],
) {
  return supabase.from('users')
    .update(data)
    .eq('id', userId)
}

/**
 * Fetches the first_name of a user.
 * Used for naming teams during registration.
 */
export async function getUserFirstName(supabase: DbClient, userId: string) {
  return supabase.from('users')
    .select('first_name')
    .eq('id', userId)
    .single()
}
