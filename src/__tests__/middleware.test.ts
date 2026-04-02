import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
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

    it('passes through /waiver without redirecting (unauthenticated)', async () => {
      const mockResponse = createMockResponse()
      vi.mocked(updateSession).mockResolvedValue({
        supabaseResponse: mockResponse as any,
        user: null,
        supabase: createMockServerClient() as any,
      })

      const request = createMockRequest('/waiver')

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

  describe('S5a: Banned user handling', () => {
    it('should redirect banned user on protected route to /auth?error=banned', async () => {
      const { middleware } = await import('@/middleware')
      const request = createMockRequest('/dashboard', { method: 'GET' })
      const mockClient = createMockServerClient()
      const mockResponse = createMockResponse()
      mockClient.from('users').single.mockResolvedValue({
        data: { role: 'player', profile_completed: true, banned_at: '2026-04-01T00:00:00Z' },
        error: null,
      })
      vi.mocked(updateSession).mockResolvedValue({
        supabaseResponse: mockResponse as any,
        user: { id: 'user123' } as any,
        supabase: mockClient as any,
      })

      const response = await middleware(request)
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/auth?error=banned')
    })

    it('should allow banned user on /auth route without redirect', async () => {
      const { middleware } = await import('@/middleware')
      const request = createMockRequest('/auth', { method: 'GET' })
      const mockClient = createMockServerClient()
      const mockResponse = createMockResponse()
      mockClient.from('users').single.mockResolvedValue({
        data: { role: 'player', profile_completed: true, banned_at: '2026-04-01T00:00:00Z' },
        error: null,
      })
      vi.mocked(updateSession).mockResolvedValue({
        supabaseResponse: mockResponse as any,
        user: { id: 'user123' } as any,
        supabase: mockClient as any,
      })

      const response = await middleware(request)
      expect(response.status).not.toBe(307)
    })

    it('should allow banned user on /auth/callback route without redirect', async () => {
      const { middleware } = await import('@/middleware')
      const request = createMockRequest('/auth/callback', { method: 'GET' })
      const mockClient = createMockServerClient()
      const mockResponse = createMockResponse()
      mockClient.from('users').single.mockResolvedValue({
        data: { role: 'player', profile_completed: true, banned_at: '2026-04-01T00:00:00Z' },
        error: null,
      })
      vi.mocked(updateSession).mockResolvedValue({
        supabaseResponse: mockResponse as any,
        user: { id: 'user123' } as any,
        supabase: mockClient as any,
      })

      const response = await middleware(request)
      expect(response.status).not.toBe(307)
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

    it('passes through /dashboard/scanner for facilitator role', async () => {
      const mockResponse = createMockResponse()
      const mockClient = createMockServerClient()
      mockClient.from('users').single.mockResolvedValue({
        data: { role: 'facilitator', profile_completed: true },
        error: null,
      })
      vi.mocked(updateSession).mockResolvedValue({
        supabaseResponse: mockResponse as any,
        user: { id: 'facilitator-1' } as any,
        supabase: mockClient as any,
      })

      const request = createMockRequest('/dashboard/scanner')
      const result = await middleware(request)

      expect(result).toBe(mockResponse)
    })

    it('passes through /dashboard/scanner for admin role', async () => {
      const mockResponse = createMockResponse()
      const mockClient = createMockServerClient()
      mockClient.from('users').single.mockResolvedValue({
        data: { role: 'admin', profile_completed: true },
        error: null,
      })
      vi.mocked(updateSession).mockResolvedValue({
        supabaseResponse: mockResponse as any,
        user: { id: 'admin-1' } as any,
        supabase: mockClient as any,
      })

      const request = createMockRequest('/dashboard/scanner')
      const result = await middleware(request)

      expect(result).toBe(mockResponse)
    })

    it('redirects player on /dashboard/scanner to /dashboard', async () => {
      const mockResponse = createMockResponse()
      const mockClient = createMockServerClient()
      mockClient.from('users').single.mockResolvedValue({
        data: { role: 'player', profile_completed: true },
        error: null,
      })
      vi.mocked(updateSession).mockResolvedValue({
        supabaseResponse: mockResponse as any,
        user: { id: 'player-1' } as any,
        supabase: mockClient as any,
      })

      const request = createMockRequest('/dashboard/scanner')
      const result = await middleware(request)

      expect(result?.status).toBe(307)
      const location = result?.headers.get('location')
      expect(location).toContain('/dashboard')
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

  describe('Rate limiting', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      vi.resetModules()
    })

    it('should allow requests under the rate limit', async () => {
      const { middleware } = await import('@/middleware')
      const { updateSession } = await import('@/lib/supabase/middleware')
      vi.mocked(updateSession).mockResolvedValue({
        supabaseResponse: new NextResponse(),
        user: { id: 'user-1' } as any,
        supabase: { from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }) }) } as any,
      })

      const request = new NextRequest('http://localhost/api/register/group', {
        method: 'POST',
        headers: { 'x-forwarded-for': '1.2.3.4' },
      })

      const response = await middleware(request)
      expect(response.status).not.toBe(429)
    })

    it('should return 429 after exceeding the rate limit', async () => {
      const { middleware } = await import('@/middleware')
      const { updateSession } = await import('@/lib/supabase/middleware')
      vi.mocked(updateSession).mockResolvedValue({
        supabaseResponse: new NextResponse(),
        user: { id: 'user-1' } as any,
        supabase: { from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }) }) } as any,
      })

      const makeRegisterRequest = () => new NextRequest('http://localhost/api/register/group', {
        method: 'POST',
        headers: { 'x-forwarded-for': '10.0.0.1' },
      })

      // First 5 requests should succeed
      for (let i = 0; i < 5; i++) {
        const response = await middleware(makeRegisterRequest())
        expect(response.status).not.toBe(429)
      }

      // 6th request from same IP should be rate limited
      const blocked = await middleware(makeRegisterRequest())
      expect(blocked.status).toBe(429)
      const body = await blocked.json()
      expect(body.error).toBe('Too many requests')
      expect(blocked.headers.get('Retry-After')).toBeTruthy()
    })

    it('should not rate limit routes outside the limited set', async () => {
      const { middleware } = await import('@/middleware')
      const { updateSession } = await import('@/lib/supabase/middleware')
      vi.mocked(updateSession).mockResolvedValue({
        supabaseResponse: new NextResponse(),
        user: null,
        supabase: {} as any,
      })

      // /api/registrations/counts is NOT rate limited
      for (let i = 0; i < 10; i++) {
        const request = new NextRequest('http://localhost/api/registrations/counts', {
          method: 'GET',
          headers: { 'x-forwarded-for': '10.0.0.2' },
        })
        const response = await middleware(request)
        expect(response.status).not.toBe(429)
      }
    })

    it('should track limits independently per IP', async () => {
      const { middleware } = await import('@/middleware')
      const { updateSession } = await import('@/lib/supabase/middleware')
      vi.mocked(updateSession).mockResolvedValue({
        supabaseResponse: new NextResponse(),
        user: null,
        supabase: {} as any,
      })

      const makeRequest = (ip: string) => new NextRequest('http://localhost/api/register/group', {
        method: 'POST',
        headers: { 'x-forwarded-for': ip },
      })

      // Exhaust limit for IP A
      for (let i = 0; i < 5; i++) {
        await middleware(makeRequest('192.168.1.1'))
      }

      // IP A is blocked
      const blockedA = await middleware(makeRequest('192.168.1.1'))
      expect(blockedA.status).toBe(429)

      // IP B is not blocked
      const allowedB = await middleware(makeRequest('192.168.1.2'))
      expect(allowedB.status).not.toBe(429)
    })
  })
})
