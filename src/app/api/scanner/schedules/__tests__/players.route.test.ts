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
    const regQuery = mockServiceClient.from('registrations')
    regQuery.select.mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'reg-1',
            attended: true,
            payment_status: 'paid',
            users: { id: 'player-1', first_name: 'Jane', last_name: 'Doe' },
          },
          {
            id: 'reg-2',
            attended: false,
            payment_status: 'paid',
            users: { id: 'player-2', first_name: 'John', last_name: 'Smith' },
          },
        ],
        error: null,
      }),
    } as any)
    vi.mocked(createServiceClient).mockReturnValue(mockServiceClient as any)

    const request = createMockRequest('/api/scanner/schedules/sched-1/players', {
      method: 'GET',
    })

    const response = await GET(request, { params: Promise.resolve({ scheduleId: 'sched-1' }) })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toHaveProperty('attended')
    expect(body).toHaveProperty('pending')
    expect(Array.isArray(body.attended)).toBe(true)
    expect(Array.isArray(body.pending)).toBe(true)
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
    const regQuery = mockServiceClient.from('registrations')
    regQuery.select.mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    } as any)
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
})
