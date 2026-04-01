import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET } from '../route'
import { createMockRequest } from '@/__tests__/helpers/next-mock'
import { createMockServiceClient } from '@/__tests__/helpers/supabase-mock'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

vi.mock('@/lib/supabase/server')
vi.mock('@/lib/supabase/service')

describe('GET /api/admin/payments/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when user is not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as any)

    const request = createMockRequest('/api/admin/payments/sch-123')
    const response = await GET(request, { params: Promise.resolve({ id: 'sch-123' }) })

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

    const request = createMockRequest('/api/admin/payments/sch-123')
    const response = await GET(request, { params: Promise.resolve({ id: 'sch-123' }) })

    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toBe('Forbidden')
  })

  it('should return payment records for admin user', async () => {
    const mockClient = createMockServiceClient()

    const paymentData = [
      {
        id: 'pay-1',
        registration_id: 'reg-1',
        payer_id: 'user-2',
        registration_type: 'solo',
        payment_status: 'paid',
        payment_proof_url: 'proof.jpg',
        extracted_amount: 500,
        extracted_reference: 'REF123',
        extracted_datetime: '2026-04-01T10:00:00Z',
        extracted_sender: 'John Doe',
        extraction_confidence: 'high',
        required_amount: 500,
        created_at: '2026-04-01T00:00:00Z',
        payment_note: 'Paid in full',
        registrations: {
          id: 'reg-1',
          player_id: 'user-2',
          users: {
            first_name: 'John',
            last_name: 'Doe',
          },
        },
        payer: {
          first_name: 'John',
          last_name: 'Doe',
        },
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
      if (table === 'registration_payments') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: paymentData,
                error: null,
              }),
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

    const request = createMockRequest('/api/admin/payments/sch-123')
    const response = await GET(request, { params: Promise.resolve({ id: 'sch-123' }) })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data).toHaveLength(1)
    expect(data[0]).toHaveProperty('id', 'pay-1')
    expect(data[0]).toHaveProperty('payment_status', 'paid')
    expect(data[0]).toHaveProperty('payment_note', 'Paid in full')
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

    // Mock payments error
    mockClient.from('registration_payments').select.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Database error'),
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

    const request = createMockRequest('/api/admin/payments/sch-123')
    const response = await GET(request, { params: Promise.resolve({ id: 'sch-123' }) })

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toBe('Failed to fetch payment records')
  })
})
