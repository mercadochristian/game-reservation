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
      // Reuse existing user and update profile fields
      const { error: updateError } = await (serviceClient.from('users') as any).update({
        first_name: guestData.first_name,
        last_name: guestData.last_name,
        player_contact_number: guestData.phone || null,
        is_guest: true,
        role: 'player',
      }).eq('id', existingUser.id)

      if (updateError) {
        const errorMsg = 'Failed to update player profile. Please try again.'
        void logError(
          `${logContext?.operationName || 'guest_user'}.profile_update`,
          updateError,
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
        user_id: existingUser.id,
        error: null,
        reused: true,
      }
    }

    // Create stub auth user
    const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
      email: guestData.email,
      email_confirm: false, // Skip email confirmation (guest already has valid email)
      user_metadata: {
        first_name: guestData.first_name,
        last_name: guestData.last_name,
      },
    })

    if (authError) {
      // If email already exists in auth, try to reuse the existing user by looking it up
      if (authError.message?.includes('already registered') || authError.code === 'email_exists') {
        // Email exists in auth but not in public.users (race condition from partial first save)
        // Query auth users to find the user_id
        const { data: authUsers } = await serviceClient.auth.admin.listUsers()
        const matchingAuthUser = authUsers?.users?.find(u => u.email === guestData.email)

        if (matchingAuthUser) {
          // Now try to insert/update the public.users record with this auth user's ID
          const { error: upsertError } = await (serviceClient.from('users') as any).upsert({
            id: matchingAuthUser.id,
            email: guestData.email,
            first_name: guestData.first_name,
            last_name: guestData.last_name,
            player_contact_number: guestData.phone || null,
            profile_completed: false,
            is_guest: true,
            role: 'player',
          }, { onConflict: 'email', ignoreDuplicates: false })

          if (upsertError) {
            const errorMsg = 'Failed to add player. Please try again.'
            void logError(
              `${logContext?.operationName || 'guest_user'}.user_insert_fallback`,
              upsertError,
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
            user_id: matchingAuthUser.id,
            error: null,
            reused: true,
          }
        }
      }

      // Auth creation failed for other reasons
      const errorMsg = 'Failed to create account. Please try again.'
      void logError(
        `${logContext?.operationName || 'guest_user'}.auth_create`,
        authError,
        logContext?.userId
      )
      return {
        user_id: null,
        error: errorMsg,
        reused: false,
      }
    }

    if (!authData.user) {
      const errorMsg = 'Failed to create account. Please try again.'
      void logError(
        `${logContext?.operationName || 'guest_user'}.auth_create`,
        new Error('Unknown auth error'),
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
    const { error: insertError } = await (serviceClient.from('users') as any).upsert({
      id: newUserId,
      email: guestData.email,
      first_name: guestData.first_name,
      last_name: guestData.last_name,
      player_contact_number: guestData.phone || null,
      profile_completed: false,
      is_guest: true,
      role: 'player',
    }, { onConflict: 'email', ignoreDuplicates: false })

    if (insertError) {
      const errorMsg = 'Failed to add player. Please try again.'
      void logError(
        `${logContext?.operationName || 'guest_user'}.user_insert`,
        insertError,
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
