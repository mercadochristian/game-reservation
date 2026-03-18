/**
 * Maps Supabase/PostgreSQL error codes to user-friendly messages.
 * Never expose raw database errors to users.
 */

/** Supabase PostgREST error codes → human-readable copy */
const POSTGREST_MESSAGES: Record<string, string> = {
  // Row not found
  PGRST116: 'The requested record could not be found.',
  // No rows returned when one was expected
  PGRST204: 'No data was returned.',
  // JWT expired
  PGRST301: 'Your session has expired. Please sign in again.',
  // JWT invalid
  PGRST302: 'Authentication failed. Please sign in again.',
  // Permission denied (RLS)
  '42501': 'You do not have permission to perform this action.',
  // Unique constraint violation
  '23505': 'This record already exists.',
  // Foreign key constraint violation
  '23503': 'This record is linked to other data and cannot be modified.',
  // Not null constraint violation
  '23502': 'A required field is missing.',
  // Check constraint violation
  '23514': 'The data you entered is invalid.',
}

/** Supabase Auth error codes → human-readable copy */
const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Invalid email or password.',
  email_not_confirmed: 'Please verify your email address.',
  user_not_found: 'No account found with that email.',
  over_email_send_rate_limit: 'Too many emails sent. Please wait a few minutes.',
  over_request_rate_limit: 'Too many requests. Please slow down.',
  session_not_found: 'Your session has expired. Please sign in again.',
  user_banned: 'Your account has been suspended.',
}

/** Supabase Storage error codes → human-readable copy */
const STORAGE_MESSAGES: Record<string, string> = {
  Unauthorized: 'You are not authorized to access this file.',
  'not found': 'The file could not be found.',
  'Payload too large': 'The file is too large to upload.',
  'Invalid mime type': 'This file type is not supported.',
}

/** Fallback message shown when no specific match is found */
export const FALLBACK_ERROR_MESSAGE =
  'Something went wrong. Please try again or check your connection.'

/**
 * Resolves an error (from Supabase or a generic Error) into a user-friendly
 * string. Never includes internal codes or stack traces.
 */
export function getUserFriendlyMessage(error: unknown): string {
  if (!error) return FALLBACK_ERROR_MESSAGE

  // Supabase query error objects ({ code, message, details, hint })
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>

    // PostgREST code (e.g. "PGRST116", "23505")
    if (typeof err.code === 'string') {
      if (POSTGREST_MESSAGES[err.code]) return POSTGREST_MESSAGES[err.code]
    }

    // Supabase auth error (has .name or .error_code)
    if (typeof err.error_code === 'string') {
      if (AUTH_MESSAGES[err.error_code]) return AUTH_MESSAGES[err.error_code]
    }

    // Storage errors often arrive as a string in .message
    if (typeof err.message === 'string') {
      for (const [key, msg] of Object.entries(STORAGE_MESSAGES)) {
        if (err.message.includes(key)) return msg
      }

      // Auth errors embedded in message string (e.g. "over_email_send_rate_limit")
      for (const [key, msg] of Object.entries(AUTH_MESSAGES)) {
        if (err.message.includes(key)) return msg
      }
    }
  }

  // Standard JS Error
  if (error instanceof Error) {
    // Network failures
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return 'A network error occurred. Please check your connection and try again.'
    }
    if (error.message.includes('timeout')) {
      return 'The request timed out. Please try again.'
    }
  }

  return FALLBACK_ERROR_MESSAGE
}
