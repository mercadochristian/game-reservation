import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from '../[scheduleId]/players/route'
import { createMockRequest } from '@/__tests__/helpers/next-mock'
import { createMockServerClient } from '@/__tests__/helpers/supabase-mock'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))

describe('GET /api/scanner/schedules/[scheduleId]/players', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when user is unauthenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const mockServerClient = createMockServerClient()
    mockServerClient.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    vi.mocked(createClient).mockResolvedValue(mockServerClient as any)

    const request = createMockRequest('/api/scanner/schedules/sched-1/players', {
      method: 'GET',
    })

    const response = await GET(request, { params: Promise.resolve({ scheduleId: 'sched-1' }) })
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

    const request = createMockRequest('/api/scanner/schedules/sched-1/players', {
      method: 'GET',
    })

    const response = await GET(request, { params: Promise.resolve({ scheduleId: 'sched-1' }) })
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toBe('Forbidden')
  })

  it('returns separated attended and pending players', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { createServiceClient } = await import('@/lib/supabase/service')

    const mockServerClient = createMockServerClient()
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'facilitator-1', email: 'fac@example.com' } },
      error: null,
    })
    mockServerClient.from('users').single.mockResolvedValue({
      data: { role: 'facilitator' },
      error: null,
    })
    vi.mocked(createClient).mockResolvedValue(mockServerClient as any)

    const mockServiceClient = createMockServerClient()
    const serviceFrom = vi.fn((table: string) => {
      if (table === 'registrations') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'reg-1',
                  attended: true,
                  payment_status: 'paid',
                  player_id: 'player-1',
                },
                {
                  id: 'reg-2',
                  attended: false,
                  payment_status: 'paid',
                  player_id: 'player-2',
                },
              ],
              error: null,
            }),
          }),
        }
      } else if (table === 'users') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [
                { id: 'player-1', first_name: 'Jane', last_name: 'Doe' },
                { id: 'player-2', first_name: 'John', last_name: 'Smith' },
              ],
              error: null,
            }),
          }),
        }
      }
      return {}
    })

    mockServiceClient.from = serviceFrom as any
    vi.mocked(createServiceClient).mockReturnValue(mockServiceClient as any)

    const request = createMockRequest('/api/scanner/schedules/sched-1/players', {
      method: 'GET',
    })

    const response = await GET(request, { params: Promise.resolve({ scheduleId: 'sched-1' }) })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toHaveProperty('attended')
    expect(body).toHaveProperty('pending')
    expect(body.attended).toHaveLength(1)
    expect(body.pending).toHaveLength(1)
    expect(body.attended[0].player.first_name).toBe('Jane')
    expect(body.pending[0].player.first_name).toBe('John')
  })

  it('returns empty arrays when no registrations exist', async () => {
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
    const serviceFrom = vi.fn((table: string) => {
      if (table === 'registrations') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }
      }
      return {}
    })

    mockServiceClient.from = serviceFrom as any
    vi.mocked(createServiceClient).mockReturnValue(mockServiceClient as any)

    const request = createMockRequest('/api/scanner/schedules/sched-1/players', {
      method: 'GET',
    })

    const response = await GET(request, { params: Promise.resolve({ scheduleId: 'sched-1' }) })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.attended).toEqual([])
    expect(body.pending).toEqual([])
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
    mockServiceClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST001', message: 'Database connection error' },
        }),
      }),
    }) as any
    vi.mocked(createServiceClient).mockReturnValue(mockServiceClient as any)

    const request = createMockRequest('/api/scanner/schedules/sched-1/players', {
      method: 'GET',
    })

    const response = await GET(request, { params: Promise.resolve({ scheduleId: 'sched-1' }) })
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toContain('error')
  })
})
