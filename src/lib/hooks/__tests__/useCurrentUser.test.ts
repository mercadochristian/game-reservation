// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import React from 'react'
import { useCurrentUser } from '../useCurrentUser'
import { UserProvider } from '@/lib/context/user-context'
import type { User } from '@/types'

const mockUser: User = {
  id: 'user-123',
  email: 'john@example.com',
  first_name: 'John',
  last_name: 'Doe',
  role: 'player',
  skill_level: 'intermediate',
  avatar_url: null,
  banned_at: null,
  birthday_month: 5,
  birthday_day: 15,
  birthday_year: 1990,
  gender: null,
  emergency_contact_name: null,
  emergency_contact_relationship: null,
  emergency_contact_number: null,
  player_contact_number: null,
  profile_completed: true,
  is_guest: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

function createWrapper(user: User | null) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(UserProvider, { user, children })
  }
}

describe('useCurrentUser', () => {
  it('returns user and isLoading=false when UserProvider has a user', () => {
    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(mockUser),
    })

    expect(result.current.user).toEqual(mockUser)
    expect(result.current.isLoading).toBe(false)
  })

  it('returns undefined user and isLoading=false when UserProvider has null', () => {
    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(null),
    })

    expect(result.current.user).toBeUndefined()
    expect(result.current.isLoading).toBe(false)
  })

  it('returns undefined user when no UserProvider wraps it (default context)', () => {
    const { result } = renderHook(() => useCurrentUser())

    expect(result.current.user).toBeUndefined()
    expect(result.current.isLoading).toBe(false)
  })
})
