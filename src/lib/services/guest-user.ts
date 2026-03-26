import { SupabaseClient } from '@supabase/supabase-js'
import { logError } from '@/lib/logger'
import { Database } from '@/types/database'

interface GuestUserInput {
  email: string
  first_name: string
  last_name: string
  phone?: string
}

interface CreateGuestUserResult {
  user_id: string | null
  error: string | null
  reused: boolean
}

/**
 * Create or reuse a guest user account
 * If the email already exists, returns the existing user ID (reused)
 * Otherwise, creates a new auth stub user and users table record
 *
 * @param serviceClient Supabase service client with admin privileges
 * @param regularClient Supabase client for regular user lookups
 * @param guestData Guest user input (email, names, optional phone)
 * @param logContext Optional context object for error logging (userId, operationName)
 * @returns Result with user_id (or null on error), error message, and reused flag
 */
export async function createGuestUser(
  serviceClient: SupabaseClient<Database>,
  regularClient: SupabaseClient<Database>,
  guestData: GuestUserInput,
  logContext?: { userId?: string; operationName?: string }
): Promise<CreateGuestUserResult> {
  try {
    // Check if email already exists in users table
    const { data: existingUser } = await regularClient
      .from('users')
      .select('id')
      .eq('email', guestData.email)
      .single() as { data: { id: string } | null; error: any }

    if (existingUser) {
      // Reuse existing user (could be a real user or another guest)
      return {
        user_id: existingUser.id,
        error: null,
        reused: true,
      }
    }

    // Create stub auth user
    const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
      email: guestData.email,
      email_confirm: true, // Skip email confirmation (guest already has valid email)
      user_metadata: {
        first_name: guestData.first_name,
        last_name: guestData.last_name,
      },
    })

    if (authError || !authData.user) {
      const errorMsg = 'Failed to create account. Please try again.'
      void logError(
        `${logContext?.operationName || 'guest_user'}.auth_create`,
        authError || new Error('Unknown auth error'),
        logContext?.userId
      )
      return {
        user_id: null,
        error: errorMsg,
        reused: false,
      }
    }

    const newUserId = authData.user.id

    // Insert public.users record
    const { error: insertError } = await (serviceClient.from('users') as any).insert({
      id: newUserId,
      email: guestData.email,
      first_name: guestData.first_name,
      last_name: guestData.last_name,
      player_contact_number: guestData.phone || null,
      profile_completed: false,
      is_guest: true,
      role: 'player',
    })

    if (insertError) {
      const errorMsg = 'Failed to add player. Please try again.'
      void logError(
        `${logContext?.operationName || 'guest_user'}.user_insert`,
        JSON.stringify(insertError),
        logContext?.userId,
        { email: guestData.email }
      )
      return {
        user_id: null,
        error: errorMsg,
        reused: false,
      }
    }

    return {
      user_id: newUserId,
      error: null,
      reused: false,
    }
  } catch (err) {
    const errorMsg = 'Failed to add guest player. Please try again.'
    void logError(
      `${logContext?.operationName || 'guest_user'}.exception`,
      err instanceof Error ? err : new Error(String(err)),
      logContext?.userId,
      { email: guestData.email }
    )
    return {
      user_id: null,
      error: errorMsg,
      reused: false,
    }
  }
}
