import { describe, it, expect } from 'vitest'
import { getUserFriendlyMessage, FALLBACK_ERROR_MESSAGE } from '../messages'

describe('getUserFriendlyMessage', () => {
  describe('FALLBACK_ERROR_MESSAGE constant', () => {
    it('is exported', () => {
      expect(FALLBACK_ERROR_MESSAGE).toBeDefined()
    })

    it('is a non-empty string', () => {
      expect(typeof FALLBACK_ERROR_MESSAGE).toBe('string')
      expect(FALLBACK_ERROR_MESSAGE.length).toBeGreaterThan(0)
    })
  })

  describe('falsy inputs', () => {
    it('returns FALLBACK_ERROR_MESSAGE for null', () => {
      expect(getUserFriendlyMessage(null)).toBe(FALLBACK_ERROR_MESSAGE)
    })

    it('returns FALLBACK_ERROR_MESSAGE for undefined', () => {
      expect(getUserFriendlyMessage(undefined)).toBe(FALLBACK_ERROR_MESSAGE)
    })

    it('returns FALLBACK_ERROR_MESSAGE for empty string', () => {
      expect(getUserFriendlyMessage('')).toBe(FALLBACK_ERROR_MESSAGE)
    })

    it('returns FALLBACK_ERROR_MESSAGE for false', () => {
      expect(getUserFriendlyMessage(false)).toBe(FALLBACK_ERROR_MESSAGE)
    })

    it('returns FALLBACK_ERROR_MESSAGE for 0', () => {
      expect(getUserFriendlyMessage(0)).toBe(FALLBACK_ERROR_MESSAGE)
    })
  })

  describe('PostgREST error codes', () => {
    it('maps PGRST116 to "The requested record could not be found."', () => {
      expect(getUserFriendlyMessage({ code: 'PGRST116' })).toBe(
        'The requested record could not be found.'
      )
    })

    it('maps PGRST204 to "No data was returned."', () => {
      expect(getUserFriendlyMessage({ code: 'PGRST204' })).toBe('No data was returned.')
    })

    it('maps PGRST301 (JWT expired)', () => {
      const result = getUserFriendlyMessage({ code: 'PGRST301' })
      expect(result).toContain('session')
      expect(result.toLowerCase()).toContain('expired')
    })

    it('maps PGRST302 (JWT invalid)', () => {
      const result = getUserFriendlyMessage({ code: 'PGRST302' })
      expect(result).toContain('Authentication')
    })

    it('maps 42501 to permission denied', () => {
      expect(getUserFriendlyMessage({ code: '42501' })).toBe(
        'You do not have permission to perform this action.'
      )
    })

    it('maps 23505 (unique constraint) to already exists', () => {
      expect(getUserFriendlyMessage({ code: '23505' })).toBe('This record already exists.')
    })

    it('maps 23503 (foreign key constraint)', () => {
      const result = getUserFriendlyMessage({ code: '23503' })
      expect(result).toContain('linked')
    })

    it('maps 23502 (not null constraint)', () => {
      const result = getUserFriendlyMessage({ code: '23502' })
      expect(result).toContain('required')
    })

    it('maps 23514 (check constraint)', () => {
      const result = getUserFriendlyMessage({ code: '23514' })
      expect(result).toContain('invalid')
    })

    it('returns FALLBACK_ERROR_MESSAGE for unknown code', () => {
      expect(getUserFriendlyMessage({ code: 'UNKNOWN_CODE' })).toBe(FALLBACK_ERROR_MESSAGE)
    })
  })

  describe('Auth error codes (error_code field)', () => {
    it('maps invalid_credentials', () => {
      expect(getUserFriendlyMessage({ error_code: 'invalid_credentials' })).toBe(
        'Invalid email or password.'
      )
    })

    it('maps email_not_confirmed', () => {
      const result = getUserFriendlyMessage({ error_code: 'email_not_confirmed' })
      expect(result).toContain('verify')
      expect(result.toLowerCase()).toContain('email')
    })

    it('maps user_not_found', () => {
      const result = getUserFriendlyMessage({ error_code: 'user_not_found' })
      expect(result).toContain('account')
    })

    it('maps over_email_send_rate_limit', () => {
      const result = getUserFriendlyMessage({ error_code: 'over_email_send_rate_limit' })
      expect(result).toContain('emails')
      expect(result.toLowerCase()).toContain('wait')
    })

    it('maps over_request_rate_limit', () => {
      const result = getUserFriendlyMessage({ error_code: 'over_request_rate_limit' })
      expect(result).toContain('requests')
    })

    it('maps session_not_found', () => {
      const result = getUserFriendlyMessage({ error_code: 'session_not_found' })
      expect(result).toContain('expired')
    })

    it('maps user_banned', () => {
      const result = getUserFriendlyMessage({ error_code: 'user_banned' })
      expect(result).toContain('suspended')
    })

    it('returns FALLBACK_ERROR_MESSAGE for unknown error_code', () => {
      expect(getUserFriendlyMessage({ error_code: 'unknown_error_code' })).toBe(
        FALLBACK_ERROR_MESSAGE
      )
    })
  })

  describe('Storage errors (message field)', () => {
    it('maps "Payload too large" to file too large', () => {
      const result = getUserFriendlyMessage({ message: 'Payload too large' })
      expect(result).toContain('large')
      expect(result).toContain('upload')
    })

    it('maps "Invalid mime type" message', () => {
      const result = getUserFriendlyMessage({ message: 'contains Invalid mime type in string' })
      // Should return a user-friendly message about file type
      expect(result.toLowerCase()).toContain('file')
      expect(result.toLowerCase()).toContain('type')
    })

    it('maps "Unauthorized"', () => {
      const result = getUserFriendlyMessage({ message: 'Unauthorized' })
      expect(result).toContain('not authorized')
    })

    it('maps "not found" (file)', () => {
      const result = getUserFriendlyMessage({ message: 'not found' })
      expect(result).toContain('could not be found')
    })
  })

  describe('Auth codes embedded in message string', () => {
    it('detects over_email_send_rate_limit in message', () => {
      const result = getUserFriendlyMessage({
        message: 'over_email_send_rate_limit: too many emails',
      })
      expect(result).toContain('emails')
    })

    it('detects user_banned in message', () => {
      const result = getUserFriendlyMessage({ message: 'user_banned: account suspended' })
      expect(result).toContain('suspended')
    })

    it('detects invalid_credentials in message', () => {
      const result = getUserFriendlyMessage({ message: 'invalid_credentials: bad input' })
      expect(result).toContain('password')
    })
  })

  describe('standard Error instances', () => {
    it('detects network error from "fetch" in message', () => {
      const error = new Error('Failed to fetch')
      const result = getUserFriendlyMessage(error)
      expect(result).toContain('network')
      expect(result.toLowerCase()).toContain('connection')
    })

    it('detects network error from "network" in message', () => {
      const error = new Error('network error: refused')
      const result = getUserFriendlyMessage(error)
      expect(result.toLowerCase()).toContain('network')
    })

    it('detects timeout error from "timeout" in message', () => {
      const error = new Error('Request timeout: 5000ms')
      const result = getUserFriendlyMessage(error)
      expect(result.toLowerCase()).toContain('timed')
      expect(result.toLowerCase()).toContain('again')
    })

    it('returns FALLBACK_ERROR_MESSAGE for generic Error', () => {
      const error = new Error('Some random error')
      expect(getUserFriendlyMessage(error)).toBe(FALLBACK_ERROR_MESSAGE)
    })
  })

  describe('plain object errors', () => {
    it('returns FALLBACK_ERROR_MESSAGE for empty object', () => {
      expect(getUserFriendlyMessage({})).toBe(FALLBACK_ERROR_MESSAGE)
    })

    it('returns FALLBACK_ERROR_MESSAGE for object with unrecognized properties', () => {
      expect(getUserFriendlyMessage({ foo: 'bar', baz: 'qux' })).toBe(FALLBACK_ERROR_MESSAGE)
    })

    it('handles object with only message field (no match)', () => {
      expect(getUserFriendlyMessage({ message: 'random message' })).toBe(FALLBACK_ERROR_MESSAGE)
    })
  })

  describe('plain strings', () => {
    it('returns FALLBACK_ERROR_MESSAGE for plain string', () => {
      expect(getUserFriendlyMessage('some error text')).toBe(FALLBACK_ERROR_MESSAGE)
    })
  })

  describe('priority and fallthrough', () => {
    it('prefers code over error_code', () => {
      const result = getUserFriendlyMessage({
        code: '23505',
        error_code: 'invalid_credentials',
      })
      expect(result).toBe('This record already exists.')
    })

    it('tries error_code if code not found', () => {
      const result = getUserFriendlyMessage({
        code: 'UNKNOWN',
        error_code: 'invalid_credentials',
      })
      expect(result).toBe('Invalid email or password.')
    })

    it('tries message field after code and error_code', () => {
      const result = getUserFriendlyMessage({
        code: 'UNKNOWN',
        error_code: 'unknown_error_code',
        message: 'Payload too large',
      })
      expect(result).toContain('large')
    })
  })
})
