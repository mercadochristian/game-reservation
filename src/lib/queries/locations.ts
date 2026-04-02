import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Fetches active locations (id and name only).
 * Used by schedule and scanner filter dropdowns.
 */
export async function getActiveLocations(supabase: SupabaseClient) {
  return (supabase.from('locations') as any)
    .select('id, name')
    .eq('is_active', true)
    .order('name')
}

/**
 * Fetches active locations with address and is_active fields.
 * Used by dashboard/payments/page.tsx.
 */
export async function getActiveLocationsWithDetails(supabase: SupabaseClient) {
  return (supabase.from('locations') as any)
    .select('id, name, address, is_active')
    .eq('is_active', true)
    .order('name', { ascending: true })
}

/**
 * Fetches all locations ordered by creation date.
 * Used by dashboard/locations/page.tsx.
 */
export async function getAllLocations(supabase: SupabaseClient) {
  return (supabase.from('locations') as any)
    .select('*')
    .order('created_at', { ascending: false })
}

/**
 * Creates a new location record.
 */
export async function createLocation(
  supabase: SupabaseClient,
  data: Record<string, unknown>,
) {
  return (supabase.from('locations') as any)
    .insert(data)
    .select('*')
    .single()
}

/**
 * Updates a location record by ID.
 */
export async function updateLocation(
  supabase: SupabaseClient,
  id: string,
  data: Record<string, unknown>,
) {
  return (supabase.from('locations') as any)
    .update(data)
    .eq('id', id)
}

/**
 * Deletes a location by ID.
 */
export async function deleteLocation(supabase: SupabaseClient, id: string) {
  return (supabase.from('locations') as any).delete().eq('id', id)
}

/**
 * Toggles the is_active flag on a location.
 */
export async function toggleLocationActive(
  supabase: SupabaseClient,
  id: string,
  isActive: boolean,
) {
  return (supabase.from('locations') as any)
    .update({ is_active: isActive })
    .eq('id', id)
}
