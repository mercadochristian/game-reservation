// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCurrentUser } from '../useCurrentUser'
import type { User } from '@/types'

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/client'

describe('useCurrentUser', () => {
  const mockUser: User = {
    id: 'user-123',
    email: 'john@example.com',
    role: 'player',
    profile_completed: true,
    created_at: '2026-01-01T00:00:00Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initializes with user=undefined and isLoading=true', () => {
    const mockAuth = {
      getUser: vi.fn(() => new Promise(() => {})), // Never resolves
    }
    const mockSupabase = {
      auth: mockAuth,
    }
    vi.mocked(createClient).mockReturnValue(mockSupabase as any)

    const { result } = renderHook(() => useCurrentUser())
    expect(result.current.user).toBeUndefined()
    expect(result.current.isLoading).toBe(true)
  })

  it('sets user to DB row when auth returns user and DB query succeeds', async () => {
    const mockAuth = {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }),
    }
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: mockUser }),
        }),
      }),
    })
    const mockSupabase = {
      auth: mockAuth,
      from: mockFrom,
    }
    vi.mocked(createClient).mockReturnValue(mockSupabase as any)

    const { result } = renderHook(() => useCurrentUser())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.user).toEqual(mockUser)
  })

  it('sets user to null when auth returns no user (unauthenticated)', async () => {
    const mockAuth = {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    }
    const mockSupabase = {
      auth: mockAuth,
    }
    vi.mocked(createClient).mockReturnValue(mockSupabase as any)

    const { result } = renderHook(() => useCurrentUser())

    await waitFor(() => {
      expect(result.current.user).toBe(null)
    })

    expect(result.current.isLoading).toBe(false)
  })

  it('sets user to null when DB returns null (user record missing)', async () => {
    const mockAuth = {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }),
    }
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
    })
    const mockSupabase = {
      auth: mockAuth,
      from: mockFrom,
    }
    vi.mocked(createClient).mockReturnValue(mockSupabase as any)

    const { result } = renderHook(() => useCurrentUser())

    await waitFor(() => {
      expect(result.current.user).toBe(null)
    })

    expect(result.current.isLoading).toBe(false)
  })

  it('queries users table with correct auth user id', async () => {
    const mockAuth = {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-456' } } }),
    }
    const mockEq = vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: mockUser }),
    })
    const mockSelect = vi.fn().mockReturnValue({
      eq: mockEq,
    })
    const mockFrom = vi.fn().mockReturnValue({
      select: mockSelect,
    })
    const mockSupabase = {
      auth: mockAuth,
      from: mockFrom,
    }
    vi.mocked(createClient).mockReturnValue(mockSupabase as any)

    renderHook(() => useCurrentUser())

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('users')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockEq).toHaveBeenCalledWith('id', 'user-456')
    })
  })

})
