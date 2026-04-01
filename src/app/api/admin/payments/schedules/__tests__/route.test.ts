import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET } from '../route'
import { createMockRequest } from '@/__tests__/helpers/next-mock'
import { createMockServiceClient } from '@/__tests__/helpers/supabase-mock'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

vi.mock('@/lib/supabase/server')
vi.mock('@/lib/supabase/service')

describe('GET /api/admin/payments/schedules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 422 when locationId is missing', async () => {
    const request = createMockRequest('/api/admin/payments/schedules')
    const response = await GET(request)

    expect(response.status).toBe(422)
    const data = await response.json()
    expect(data.error).toBe('Location ID required')
  })

  it('should return 401 when user is not authenticated', async () => {
    const mockClient = createMockServiceClient()
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as any)

    const request = createMockRequest('/api/admin/payments/schedules?locationId=loc-123')
    const response = await GET(request)

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 403 when user is not admin', async () => {
    const mockClient = createMockServiceClient()
    mockClient.from('users').select.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { role: 'player' },
          error: null,
        }),
      }),
    } as any)

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: mockClient.from,
    } as any)

    vi.mocked(createServiceClient).mockReturnValue(mockClient as any)

    const request = createMockRequest('/api/admin/payments/schedules?locationId=loc-123')
    const response = await GET(request)

    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toBe('Forbidden')
  })

  it('should return schedules with payment summaries for admin user', async () => {
    const mockClient = createMockServiceClient()

    // Mock user role check
    mockClient.from('users').select.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { role: 'admin' },
          error: null,
        }),
      }),
    } as any)

    // Mock schedules fetch with full chain support
    const schedulesData = [
      {
        id: 'sch-1',
        start_time: '2026-04-15T10:00:00Z',
        end_time: '2026-04-15T12:00:00Z',
        location_id: 'loc-123',
        max_players: 12,
        created_at: '2026-04-01T00:00:00Z',
        updated_at: '2026-04-01T00:00:00Z',
        locations: {
          id: 'loc-123',
          name: 'Sports Hall A',
          address: '123 Main St',
          google_map_url: null,
        },
      },
    ]

    const paymentsData = [
      {
        schedule_id: 'sch-1',
        payment_status: 'paid',
        extracted_amount: 500,
      },
      {
        schedule_id: 'sch-1',
        payment_status: 'pending',
        extracted_amount: 500,
      },
    ]

    mockClient.from = vi.fn().mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { role: 'admin' },
                error: null,
              }),
            }),
          })
        }
      }
      if (table === 'schedules') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: schedulesData,
                    error: null,
                  }),
                }),
                order: vi.fn().mockResolvedValue({
                  data: schedulesData,
                  error: null,
                }),
              }),
            }),
          })
        }
      }
      if (table === 'registration_payments') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: paymentsData,
              error: null,
            }),
          })
        }
      }
    })

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: mockClient.from,
    } as any)

    vi.mocked(createServiceClient).mockReturnValue(mockClient as any)

    const request = createMockRequest('/api/admin/payments/schedules?locationId=loc-123&dateRange=all')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data).toHaveLength(1)
    expect(data[0]).toHaveProperty('totalCollected', 500)
    expect(data[0]).toHaveProperty('pendingCount', 1)
  })

  it('should handle database errors gracefully', async () => {
    const mockClient = createMockServiceClient()

    // Mock user role check
    mockClient.from('users').select.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { role: 'admin' },
          error: null,
        }),
      }),
    } as any)

    // Mock schedules error
    mockClient.from('schedules').select.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        gte: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: new Error('Database error'),
          }),
        }),
      }),
    } as any)

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: mockClient.from,
    } as any)

    vi.mocked(createServiceClient).mockReturnValue(mockClient as any)

    const request = createMockRequest('/api/admin/payments/schedules?locationId=loc-123')
    const response = await GET(request)

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toBe('Failed to fetch payment schedules')
  })
})
