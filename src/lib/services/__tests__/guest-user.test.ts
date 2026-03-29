import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createGuestUser } from '../guest-user'
import { SupabaseClient } from '@supabase/supabase-js'

// Mock the logger
vi.mock('@/lib/logger', () => ({
  logError: vi.fn(),
}))

describe('guest-user', () => {
  let mockServiceClient: any
  let mockRegularClient: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockServiceClient = {
      from: vi.fn(),
      auth: {
        admin: {
          createUser: vi.fn(),
        },
      },
    }

    mockRegularClient = {
      from: vi.fn(),
    }
  })

  describe('createGuestUser', () => {
    const guestData = {
      email: 'guest@example.com',
      first_name: 'John',
      last_name: 'Doe',
      phone: '555-1234',
      skill_level: 'intermediate',
    }

    it('creates a new guest user successfully', async () => {
      const newUserId = 'user-123'

      // Mock: no existing user
      mockRegularClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      })

      // Mock: auth user creation
      mockServiceClient.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: newUserId } },
        error: null,
      })

      // Mock: users table upsert
      mockServiceClient.from.mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      })

      const result = await createGuestUser(mockServiceClient, mockRegularClient, guestData, {
        userId: 'admin-user',
        operationName: 'test_operation',
      })

      expect(result).toEqual({
        user_id: newUserId,
        error: null,
        reused: false,
      })

      // Verify calls
      expect(mockServiceClient.auth.admin.createUser).toHaveBeenCalledWith({
        email: guestData.email,
        email_confirm: false,
        user_metadata: {
          first_name: guestData.first_name,
          last_name: guestData.last_name,
        },
      })

      expect(mockServiceClient.from).toHaveBeenCalledWith('users')
      const upsertCall = mockServiceClient.from().upsert.mock.calls[0]
      expect(upsertCall[0]).toEqual({
        id: newUserId,
        email: guestData.email,
        first_name: guestData.first_name,
        last_name: guestData.last_name,
        player_contact_number: guestData.phone,
        skill_level: guestData.skill_level,
        profile_completed: false,
        is_guest: true,
        role: 'player',
      })
    })

    it('reuses an existing user by email', async () => {
      const existingUserId = 'existing-user-456'

      mockRegularClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: existingUserId },
              error: null,
            }),
          }),
        }),
      })

      // Mock: service client update for existing user
      mockServiceClient.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      })

      const result = await createGuestUser(mockServiceClient, mockRegularClient, guestData)

      expect(result).toEqual({
        user_id: existingUserId,
        error: null,
        reused: true,
      })

      // Should not attempt to create auth
      expect(mockServiceClient.auth.admin.createUser).not.toHaveBeenCalled()
    })

    it('handles auth.admin.createUser failure', async () => {
      const authError = new Error('Auth service unavailable')

      mockRegularClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      })

      mockServiceClient.auth.admin.createUser.mockResolvedValue({
        data: { user: null },
        error: authError,
      })

      const result = await createGuestUser(mockServiceClient, mockRegularClient, guestData, {
        userId: 'admin-user',
        operationName: 'test_operation',
      })

      expect(result).toEqual({
        user_id: null,
        error: 'Failed to create account. Please try again.',
        reused: false,
      })
    })

    it('handles missing user data on auth creation', async () => {
      mockRegularClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      })

      mockServiceClient.auth.admin.createUser.mockResolvedValue({
        data: { user: null }, // Missing user
        error: null,
      })

      const result = await createGuestUser(mockServiceClient, mockRegularClient, guestData)

      expect(result).toEqual({
        user_id: null,
        error: 'Failed to create account. Please try again.',
        reused: false,
      })
    })

    it('handles users table insert failure', async () => {
      const newUserId = 'user-789'
      const insertError = new Error('Unique constraint violation')

      mockRegularClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      })

      mockServiceClient.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: newUserId } },
        error: null,
      })

      mockServiceClient.from.mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: insertError }),
      })

      const result = await createGuestUser(mockServiceClient, mockRegularClient, guestData, {
        userId: 'admin-user',
      })

      expect(result).toEqual({
        user_id: null,
        error: 'Failed to add player. Please try again.',
        reused: false,
      })
    })

    it('handles exception during user creation', async () => {
      mockRegularClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockRejectedValue(new Error('Connection timeout')),
          }),
        }),
      })

      const result = await createGuestUser(mockServiceClient, mockRegularClient, guestData)

      expect(result).toEqual({
        user_id: null,
        error: 'Failed to add guest player. Please try again.',
        reused: false,
      })
    })

    it('handles missing phone number gracefully', async () => {
      const newUserId = 'user-999'
      const guestDataNoPhone = {
        email: 'guest2@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        skill_level: 'beginner',
      }

      mockRegularClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      })

      mockServiceClient.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: newUserId } },
        error: null,
      })

      mockServiceClient.from.mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      })

      const result = await createGuestUser(mockServiceClient, mockRegularClient, guestDataNoPhone)

      expect(result.user_id).toBe(newUserId)
      expect(result.error).toBeNull()

      const upsertCall = mockServiceClient.from().upsert.mock.calls[0][0]
      expect(upsertCall.player_contact_number).toBeNull()
    })
  })
})
