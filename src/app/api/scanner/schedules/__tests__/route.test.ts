import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from '../route'
import { createMockRequest } from '@/__tests__/helpers/next-mock'
import { createMockServerClient } from '@/__tests__/helpers/supabase-mock'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))

describe('GET /api/scanner/schedules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when user is unauthenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const mockServerClient = createMockServerClient()
    mockServerClient.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    vi.mocked(createClient).mockResolvedValue(mockServerClient as any)

    const request = createMockRequest('/api/scanner/schedules?locationId=loc-1&dateRange=date:2026-04-01', {
      method: 'GET',
    })

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 403 when role is not allowed', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const mockServerClient = createMockServerClient()
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'player-1', email: 'player@example.com' } },
      error: null,
    })
    mockServerClient.from('users').single.mockResolvedValue({
      data: { role: 'player' },
      error: null,
    })
    vi.mocked(createClient).mockResolvedValue(mockServerClient as any)

    const request = createMockRequest('/api/scanner/schedules?locationId=loc-1&dateRange=date:2026-04-01', {
      method: 'GET',
    })

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toBe('Forbidden')
  })


  it('returns empty array when no schedules match filters', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { createServiceClient } = await import('@/lib/supabase/service')

    const mockServerClient = createMockServerClient()
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-1', email: 'admin@example.com' } },
      error: null,
    })
    mockServerClient.from('users').single.mockResolvedValue({
      data: { role: 'admin' },
      error: null,
    })
    vi.mocked(createClient).mockResolvedValue(mockServerClient as any)

    const mockServiceClient = createMockServerClient()
    const scheduleQuery = mockServiceClient.from('schedules')
    scheduleQuery.select.mockReturnValue({
      gte: vi.fn().mockReturnValue({
        lte: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      }),
    } as any)
    vi.mocked(createServiceClient).mockReturnValue(mockServiceClient as any)

    const request = createMockRequest('/api/scanner/schedules?locationId=loc-999&dateRange=date:2030-01-01', {
      method: 'GET',
    })

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual([])
  })

  it('returns 500 when database query fails', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { createServiceClient } = await import('@/lib/supabase/service')

    const mockServerClient = createMockServerClient()
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-1', email: 'admin@example.com' } },
      error: null,
    })
    mockServerClient.from('users').single.mockResolvedValue({
      data: { role: 'admin' },
      error: null,
    })
    vi.mocked(createClient).mockResolvedValue(mockServerClient as any)

    const mockServiceClient = createMockServerClient()
    const scheduleQuery = mockServiceClient.from('schedules')
    scheduleQuery.select.mockReturnValue({
      gte: vi.fn().mockReturnValue({
        lte: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST001', message: 'Database connection error' },
            }),
          }),
        }),
      }),
    } as any)
    vi.mocked(createServiceClient).mockReturnValue(mockServiceClient as any)

    const request = createMockRequest('/api/scanner/schedules?locationId=loc-1&dateRange=date:2026-04-01', {
      method: 'GET',
    })

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toContain('error')
  })
})
