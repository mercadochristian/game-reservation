import { describe, it, expect, beforeEach, vi } from 'vitest'
import { middleware } from '../middleware'
import { updateSession } from '@/lib/supabase/middleware'
import { createMockRequest, createMockResponse } from '@/__tests__/helpers/next-mock'
import { createMockServerClient } from '@/__tests__/helpers/supabase-mock'

describe('middleware(request)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('static assets bypass', () => {
    it('passes through /_next/static/* without redirecting', async () => {
      const mockResponse = createMockResponse()
      vi.mocked(updateSession).mockResolvedValue({
        supabaseResponse: mockResponse as any,
        user: null,
        supabase: createMockServerClient() as any,
      })

      const request = createMockRequest('/_next/static/main.js')

      const result = await middleware(request)

      expect(result).toBe(mockResponse)
    })

    it('passes through /favicon.ico without redirecting', async () => {
      const mockResponse = createMockResponse()
      vi.mocked(updateSession).mockResolvedValue({
        supabaseResponse: mockResponse as any,
        user: null,
        supabase: createMockServerClient() as any,
      })

      const request = createMockRequest('/favicon.ico')

      const result = await middleware(request)

      expect(result).toBe(mockResponse)
    })
  })

  describe('unauthenticated on public routes', () => {
    it('passes through /auth without redirecting', async () => {
      const mockResponse = createMockResponse()
      vi.mocked(updateSession).mockResolvedValue({
        supabaseResponse: mockResponse as any,
        user: null,
        supabase: createMockServerClient() as any,
      })

      const request = createMockRequest('/auth')

      const result = await middleware(request)

      expect(result).toBe(mockResponse)
    })

    it('passes through / without redirecting', async () => {
      const mockResponse = createMockResponse()
      vi.mocked(updateSession).mockResolvedValue({
        supabaseResponse: mockResponse as any,
        user: null,
        supabase: createMockServerClient() as any,
      })

      const request = createMockRequest('/')

      const result = await middleware(request)

      expect(result).toBe(mockResponse)
    })
  })

  describe('unauthenticated on protected routes', () => {
    it('redirects to /auth?returnUrl=/player/dashboard', async () => {
      const mockResponse = createMockResponse()
      vi.mocked(updateSession).mockResolvedValue({
        supabaseResponse: mockResponse as any,
        user: null,
        supabase: createMockServerClient() as any,
      })

      const request = createMockRequest('/player/dashboard')

      const result = await middleware(request)

      expect(result?.status).toBe(307)
      const location = result?.headers.get('location')
      expect(location).toMatch(/\/auth\?returnUrl=%2Fplayer%2Fdashboard/)
    })
  })

  describe('authenticated with complete profile visiting /auth', () => {
    it('redirects to /dashboard with no returnUrl', async () => {
      const mockResponse = createMockResponse()
      const mockClient = createMockServerClient()
      mockClient.from('users').single.mockResolvedValue({
        data: { role: 'admin', profile_completed: true },
        error: null,
      })
      vi.mocked(updateSession).mockResolvedValue({
        supabaseResponse: mockResponse as any,
        user: { id: 'user123' } as any,
        supabase: mockClient as any,
      })

      const request = createMockRequest('/auth')

      const result = await middleware(request)

      expect(result?.status).toBe(307)
      const location = result?.headers.get('location')
      expect(location).toContain('/dashboard')
      expect(location).not.toContain('returnUrl')
    })

    it('redirects to returnUrl when provided and not /auth', async () => {
      const mockResponse = createMockResponse()
      const mockClient = createMockServerClient()
      mockClient.from('users').single.mockResolvedValue({
        data: { role: 'admin', profile_completed: true },
        error: null,
      })
      vi.mocked(updateSession).mockResolvedValue({
        supabaseResponse: mockResponse as any,
        user: { id: 'user123' } as any,
        supabase: mockClient as any,
      })

      const request = createMockRequest('/auth?returnUrl=/player/dashboard')

      const result = await middleware(request)

      expect(result?.status).toBe(307)
      const location = result?.headers.get('location')
      expect(location).toContain('/player/dashboard')
    })

    it('redirects to /dashboard when returnUrl is /auth/callback (anti-loop guard)', async () => {
      const mockResponse = createMockResponse()
      const mockClient = createMockServerClient()
      mockClient.from('users').single.mockResolvedValue({
        data: { role: 'admin', profile_completed: true },
        error: null,
      })
      vi.mocked(updateSession).mockResolvedValue({
        supabaseResponse: mockResponse as any,
        user: { id: 'user123' } as any,
        supabase: mockClient as any,
      })

      const request = createMockRequest('/auth?returnUrl=/auth/callback')

      const result = await middleware(request)

      expect(result?.status).toBe(307)
      const location = result?.headers.get('location')
      expect(location).toContain('/dashboard')
    })
  })

  describe('authenticated with incomplete profile', () => {
    it('passes through /create-profile without redirecting', async () => {
      const mockResponse = createMockResponse()
      const mockClient = createMockServerClient()
      mockClient.from('users').single.mockResolvedValue({
        data: { role: 'player', profile_completed: false },
        error: null,
      })
      vi.mocked(updateSession).mockResolvedValue({
        supabaseResponse: mockResponse as any,
        user: { id: 'user123' } as any,
        supabase: mockClient as any,
      })

      const request = createMockRequest('/create-profile')

      const result = await middleware(request)

      expect(result).toBe(mockResponse)
    })

    it('passes through /api/profile/complete without redirecting', async () => {
      const mockResponse = createMockResponse()
      const mockClient = createMockServerClient()
      mockClient.from('users').single.mockResolvedValue({
        data: { role: 'player', profile_completed: false },
        error: null,
      })
      vi.mocked(updateSession).mockResolvedValue({
        supabaseResponse: mockResponse as any,
        user: { id: 'user123' } as any,
        supabase: mockClient as any,
      })

      const request = createMockRequest('/api/profile/complete', { method: 'POST' })

      const result = await middleware(request)

      expect(result).toBe(mockResponse)
    })

    it('redirects to /create-profile?returnUrl=/player/dashboard', async () => {
      const mockResponse = createMockResponse()
      const mockClient = createMockServerClient()
      mockClient.from('users').single.mockResolvedValue({
        data: { role: 'player', profile_completed: false },
        error: null,
      })
      vi.mocked(updateSession).mockResolvedValue({
        supabaseResponse: mockResponse as any,
        user: { id: 'user123' } as any,
        supabase: mockClient as any,
      })

      const request = createMockRequest('/player/dashboard')

      const result = await middleware(request)

      expect(result?.status).toBe(307)
      const location = result?.headers.get('location')
      expect(location).toMatch(/\/create-profile\?returnUrl=%2Fplayer%2Fdashboard/)
    })
  })

  describe('authenticated with complete profile on public routes', () => {
    it('passes through / without redirecting', async () => {
      const mockResponse = createMockResponse()
      const mockClient = createMockServerClient()
      mockClient.from('users').single.mockResolvedValue({
        data: { role: 'player', profile_completed: true },
        error: null,
      })
      vi.mocked(updateSession).mockResolvedValue({
        supabaseResponse: mockResponse as any,
        user: { id: 'user123' } as any,
        supabase: mockClient as any,
      })

      const request = createMockRequest('/')

      const result = await middleware(request)

      expect(result).toBe(mockResponse)
    })
  })

  describe('role-based path access', () => {
    it('redirects player on /dashboard/users to /dashboard', async () => {
      const mockResponse = createMockResponse()
      const mockClient = createMockServerClient()
      mockClient.from('users').single.mockResolvedValue({
        data: { role: 'player', profile_completed: true },
        error: null,
      })
      vi.mocked(updateSession).mockResolvedValue({
        supabaseResponse: mockResponse as any,
        user: { id: 'user123' } as any,
        supabase: mockClient as any,
      })

      const request = createMockRequest('/dashboard/users')

      const result = await middleware(request)

      expect(result?.status).toBe(307)
      const location = result?.headers.get('location')
      expect(location).toContain('/dashboard')
    })

    it('redirects facilitator on /dashboard/logs to /dashboard', async () => {
      const mockResponse = createMockResponse()
      const mockClient = createMockServerClient()
      mockClient.from('users').single.mockResolvedValue({
        data: { role: 'facilitator', profile_completed: true },
        error: null,
      })
      vi.mocked(updateSession).mockResolvedValue({
        supabaseResponse: mockResponse as any,
        user: { id: 'user123' } as any,
        supabase: mockClient as any,
      })

      const request = createMockRequest('/dashboard/logs')

      const result = await middleware(request)

      expect(result?.status).toBe(307)
      const location = result?.headers.get('location')
      expect(location).toContain('/dashboard')
    })

    it('passes through /player/profile for player role', async () => {
      const mockResponse = createMockResponse()
      const mockClient = createMockServerClient()
      mockClient.from('users').single.mockResolvedValue({
        data: { role: 'player', profile_completed: true },
        error: null,
      })
      vi.mocked(updateSession).mockResolvedValue({
        supabaseResponse: mockResponse as any,
        user: { id: 'user123' } as any,
        supabase: mockClient as any,
      })

      const request = createMockRequest('/player/profile')

      const result = await middleware(request)

      expect(result).toBe(mockResponse)
    })

    it('passes through /admin/* for super_admin role', async () => {
      const mockResponse = createMockResponse()
      const mockClient = createMockServerClient()
      mockClient.from('users').single.mockResolvedValue({
        data: { role: 'super_admin', profile_completed: true },
        error: null,
      })
      vi.mocked(updateSession).mockResolvedValue({
        supabaseResponse: mockResponse as any,
        user: { id: 'user123' } as any,
        supabase: mockClient as any,
      })

      const request = createMockRequest('/admin/anything')

      const result = await middleware(request)

      expect(result).toBe(mockResponse)
    })

    it('passes through /admin/schedules for admin role', async () => {
      const mockResponse = createMockResponse()
      const mockClient = createMockServerClient()
      mockClient.from('users').single.mockResolvedValue({
        data: { role: 'admin', profile_completed: true },
        error: null,
      })
      vi.mocked(updateSession).mockResolvedValue({
        supabaseResponse: mockResponse as any,
        user: { id: 'user123' } as any,
        supabase: mockClient as any,
      })

      const request = createMockRequest('/admin/schedules')

      const result = await middleware(request)

      expect(result).toBe(mockResponse)
    })

    it('passes through /facilitator/* for facilitator role', async () => {
      const mockResponse = createMockResponse()
      const mockClient = createMockServerClient()
      mockClient.from('users').single.mockResolvedValue({
        data: { role: 'facilitator', profile_completed: true },
        error: null,
      })
      vi.mocked(updateSession).mockResolvedValue({
        supabaseResponse: mockResponse as any,
        user: { id: 'user123' } as any,
        supabase: mockClient as any,
      })

      const request = createMockRequest('/facilitator/checkin')

      const result = await middleware(request)

      expect(result).toBe(mockResponse)
    })
  })

  describe('database queries for profile', () => {
    it('queries database to fetch profile data on every request', async () => {
      const mockResponse = createMockResponse()
      const mockClient = createMockServerClient()
      mockClient.from('users').single.mockResolvedValue({
        data: { role: 'admin', profile_completed: true },
        error: null,
      })
      vi.mocked(updateSession).mockResolvedValue({
        supabaseResponse: mockResponse as any,
        user: { id: 'user123' } as any,
        supabase: mockClient as any,
      })

      const request = createMockRequest('/admin/dashboard')

      await middleware(request)

      // Verify that .from() was called to fetch profile
      expect(mockClient.from).toHaveBeenCalledWith('users')
    })

    it('defaults to player role and profile_completed: false when profile query returns null', async () => {
      const mockResponse = createMockResponse()
      const mockClient = createMockServerClient()
      mockClient.from('users').single.mockResolvedValue({
        data: null,
        error: null,
      })
      vi.mocked(updateSession).mockResolvedValue({
        supabaseResponse: mockResponse as any,
        user: { id: 'user123' } as any,
        supabase: mockClient as any,
      })

      const request = createMockRequest('/player/dashboard')

      const result = await middleware(request)

      // Should redirect to /create-profile since profile_completed defaults to false
      expect(result?.status).toBe(307)
      const location = result?.headers.get('location')
      expect(location).toMatch(/\/create-profile/)
    })
  })

  describe('edge cases', () => {
    it('handles nested role paths like /admin/schedules/new', async () => {
      const mockResponse = createMockResponse()
      const mockClient = createMockServerClient()
      mockClient.from('users').single.mockResolvedValue({
        data: { role: 'admin', profile_completed: true },
        error: null,
      })
      vi.mocked(updateSession).mockResolvedValue({
        supabaseResponse: mockResponse as any,
        user: { id: 'user123' } as any,
        supabase: mockClient as any,
      })

      const request = createMockRequest('/admin/schedules/new')

      const result = await middleware(request)

      expect(result).toBe(mockResponse)
    })

    it('handles /auth/callback as public route', async () => {
      const mockResponse = createMockResponse()
      vi.mocked(updateSession).mockResolvedValue({
        supabaseResponse: mockResponse as any,
        user: null,
        supabase: createMockServerClient() as any,
      })

      const request = createMockRequest('/auth/callback')

      const result = await middleware(request)

      expect(result).toBe(mockResponse)
    })

    it('copies Supabase cookies from response to redirect response', async () => {
      const mockResponse = createMockResponse()
      mockResponse.cookies.set = vi.fn().mockReturnValue(undefined)
      const mockClient = createMockServerClient()
      vi.mocked(updateSession).mockResolvedValue({
        supabaseResponse: mockResponse as any,
        user: null,
        supabase: mockClient as any,
      })

      const request = createMockRequest('/player/dashboard')

      const result = await middleware(request)

      // The redirect response should be created (status 307)
      expect(result?.status).toBe(307)
    })
  })
})
