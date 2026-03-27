// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import React from 'react'
import { UserProvider, useUser, useRequiredUser } from '../user-context'
import type { User } from '@/types'

const mockUser: User = {
  id: 'user-123',
  email: 'john@example.com',
  first_name: 'John',
  last_name: 'Doe',
  role: 'player',
  skill_level: 'intermediate',
  avatar_url: null,
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
    return <UserProvider user={user}>{children}</UserProvider>
  }
}

describe('UserContext', () => {
  describe('useUser', () => {
    it('returns user and isAuthenticated=true when provider has a user', () => {
      const { result } = renderHook(() => useUser(), {
        wrapper: createWrapper(mockUser),
      })

      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('returns null user and isAuthenticated=false when provider has null', () => {
      const { result } = renderHook(() => useUser(), {
        wrapper: createWrapper(null),
      })

      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('returns null user when no provider wraps it (default context)', () => {
      const { result } = renderHook(() => useUser())

      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('inner provider overrides outer provider (nested providers)', () => {
      const adminUser = { ...mockUser, id: 'admin-1', role: 'admin' as const }

      function NestedWrapper({ children }: { children: React.ReactNode }) {
        return (
          <UserProvider user={null}>
            <UserProvider user={adminUser}>{children}</UserProvider>
          </UserProvider>
        )
      }

      const { result } = renderHook(() => useUser(), {
        wrapper: NestedWrapper,
      })

      expect(result.current.user).toEqual(adminUser)
      expect(result.current.isAuthenticated).toBe(true)
    })
  })

  describe('useRequiredUser', () => {
    it('returns user when provider has a user', () => {
      const { result } = renderHook(() => useRequiredUser(), {
        wrapper: createWrapper(mockUser),
      })

      expect(result.current).toEqual(mockUser)
    })

    it('throws when provider has null user', () => {
      expect(() => {
        renderHook(() => useRequiredUser(), {
          wrapper: createWrapper(null),
        })
      }).toThrow('useRequiredUser must be used within an authenticated route')
    })
  })
})
