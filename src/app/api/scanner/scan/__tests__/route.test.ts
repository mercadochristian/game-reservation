import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '../route'
import { createMockRequest } from '@/__tests__/helpers/next-mock'
import { createMockServerClient, createMockServiceClient } from '@/__tests__/helpers/supabase-mock'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))

describe('POST /api/scanner/scan', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 for invalid qr_token payload', async () => {
    const request = createMockRequest('/api/scanner/scan', {
      method: 'POST',
      body: { qr_token: 'not-a-uuid', schedule_id: '123e4567-e89b-12d3-a456-426614174000' },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toContain('valid UUID')
  })

  it('returns 401 when user is unauthenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const mockServerClient = createMockServerClient()
    mockServerClient.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    vi.mocked(createClient).mockResolvedValue(mockServerClient as any)

    const request = createMockRequest('/api/scanner/scan', {
      method: 'POST',
      body: { qr_token: '123e4567-e89b-12d3-a456-426614174000', schedule_id: '123e4567-e89b-12d3-a456-426614174000' },
    })

    const response = await POST(request)
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

    const request = createMockRequest('/api/scanner/scan', {
      method: 'POST',
      body: { qr_token: '123e4567-e89b-12d3-a456-426614174000', schedule_id: '123e4567-e89b-12d3-a456-426614174000' },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toBe('Forbidden')
  })

  it('returns 404 when qr_token has no matching registration', async () => {
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

    const mockServiceClient = createMockServiceClient()
    // Mock the registration lookup chain to return no results
    const registrationQuery = mockServiceClient.from('registrations')
    registrationQuery.select.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'not found' },
        }),
      }),
    } as any)
    vi.mocked(createServiceClient).mockReturnValue(mockServiceClient as any)

    const request = createMockRequest('/api/scanner/scan', {
      method: 'POST',
      body: { qr_token: '123e4567-e89b-12d3-a456-426614174000', schedule_id: '123e4567-e89b-12d3-a456-426614174000' },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toContain('not found')
  })

  it('marks attendance and returns success payload', async () => {
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

    const mockServiceClient = createMockServiceClient()
    const serviceFrom = vi.fn((table: string) => {
      if (table === 'registrations') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 'reg-1',
                  attended: false,
                  schedule_id: '223e4567-e89b-12d3-a456-426614174000',
                  player_id: 'player-1',
                  registration_payments: { payment_status: 'paid' },
                },
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }
      } else if (table === 'schedules') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: '223e4567-e89b-12d3-a456-426614174000', start_time: '2026-04-05T10:00:00.000Z' },
                error: null,
              }),
            }),
          }),
        }
      } else if (table === 'users') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 'player-1', first_name: 'Jane', last_name: 'Doe' },
                error: null,
              }),
            }),
          }),
        }
      }
      return {}
    })

    mockServiceClient.from = serviceFrom as any
    vi.mocked(createServiceClient).mockReturnValue(mockServiceClient as any)

    const request = createMockRequest('/api/scanner/scan', {
      method: 'POST',
      body: { qr_token: '123e4567-e89b-12d3-a456-426614174000', schedule_id: '223e4567-e89b-12d3-a456-426614174000' },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.registration_id).toBe('reg-1')
    expect(body.attended).toBe(true)
    expect(body.already_attended).toBe(false)
  })

  it('accepts URL payload and resolves UUID from query string', async () => {
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

    const mockServiceClient = createMockServiceClient()
    const serviceFrom = vi.fn((table: string) => {
      if (table === 'registrations') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 'reg-1',
                  attended: true,
                  schedule_id: '223e4567-e89b-12d3-a456-426614174000',
                  player_id: 'player-1',
                  registration_payments: { payment_status: 'paid' },
                },
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }
      } else if (table === 'schedules') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: '223e4567-e89b-12d3-a456-426614174000', start_time: '2026-04-05T10:00:00.000Z' },
                error: null,
              }),
            }),
          }),
        }
      } else if (table === 'users') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 'player-1', first_name: 'Jane', last_name: 'Doe' },
                error: null,
              }),
            }),
          }),
        }
      }
      return {}
    })

    mockServiceClient.from = serviceFrom as any
    vi.mocked(createServiceClient).mockReturnValue(mockServiceClient as any)

    const request = createMockRequest('/api/scanner/scan', {
      method: 'POST',
      body: { qr_token: 'https://example.com/checkin?qr_token=123e4567-e89b-12d3-a456-426614174000', schedule_id: '223e4567-e89b-12d3-a456-426614174000' },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.registration_id).toBe('reg-1')
  })

  it('returns 403 when registration does not belong to selected schedule', async () => {
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

    const mockServiceClient = createMockServiceClient()
    const serviceFrom = vi.fn((table: string) => {
      if (table === 'registrations') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 'reg-1',
                  attended: false,
                  schedule_id: '223e4567-e89b-12d3-a456-426614174000',
                  player_id: 'player-1',
                  registration_payments: { payment_status: 'paid' },
                },
                error: null,
              }),
            }),
          }),
        }
      }
      return {}
    })

    mockServiceClient.from = serviceFrom as any
    vi.mocked(createServiceClient).mockReturnValue(mockServiceClient as any)

    const request = createMockRequest('/api/scanner/scan', {
      method: 'POST',
      body: { qr_token: '123e4567-e89b-12d3-a456-426614174000', schedule_id: '323e4567-e89b-12d3-a456-426614174000' },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toContain('does not belong')
  })

  it('returns 402 with payment info when payment is pending', async () => {
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

    const mockServiceClient = createMockServiceClient()
    const serviceFrom = vi.fn((table: string) => {
      if (table === 'registrations') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 'reg-1',
                  attended: false,
                  schedule_id: '223e4567-e89b-12d3-a456-426614174000',
                  player_id: 'player-1',
                  registration_payments: { payment_status: 'pending' },
                },
                error: null,
              }),
            }),
          }),
        }
      } else if (table === 'registration_payments') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  required_amount: 350,
                  payment_note: null,
                },
                error: null,
              }),
            }),
          }),
        }
      }
      return {}
    })

    mockServiceClient.from = serviceFrom as any
    vi.mocked(createServiceClient).mockReturnValue(mockServiceClient as any)

    const request = createMockRequest('/api/scanner/scan', {
      method: 'POST',
      body: { qr_token: '123e4567-e89b-12d3-a456-426614174000', schedule_id: '223e4567-e89b-12d3-a456-426614174000' },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(402)
    expect(body.error).toBe('Payment not approved')
    expect(body.payment_status).toBe('pending')
    expect(body.required_amount).toBe(350)
  })

  it('returns 402 with rejection note when payment is rejected', async () => {
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

    const mockServiceClient = createMockServiceClient()
    const serviceFrom = vi.fn((table: string) => {
      if (table === 'registrations') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 'reg-1',
                  attended: false,
                  schedule_id: '223e4567-e89b-12d3-a456-426614174000',
                  player_id: 'player-1',
                  registration_payments: { payment_status: 'rejected' },
                },
                error: null,
              }),
            }),
          }),
        }
      } else if (table === 'registration_payments') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  required_amount: 350,
                  payment_note: 'Amount does not match required fee',
                },
                error: null,
              }),
            }),
          }),
        }
      }
      return {}
    })

    mockServiceClient.from = serviceFrom as any
    vi.mocked(createServiceClient).mockReturnValue(mockServiceClient as any)

    const request = createMockRequest('/api/scanner/scan', {
      method: 'POST',
      body: { qr_token: '123e4567-e89b-12d3-a456-426614174000', schedule_id: '223e4567-e89b-12d3-a456-426614174000' },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(402)
    expect(body.error).toBe('Payment not approved')
    expect(body.payment_status).toBe('rejected')
    expect(body.payment_note).toBe('Amount does not match required fee')
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

    const mockServiceClient = createMockServiceClient()
    mockServiceClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST001', message: 'Database connection error' },
          }),
        }),
      }),
    }) as any
    vi.mocked(createServiceClient).mockReturnValue(mockServiceClient as any)

    const request = createMockRequest('/api/scanner/scan', {
      method: 'POST',
      body: { qr_token: '123e4567-e89b-12d3-a456-426614174000', schedule_id: '223e4567-e89b-12d3-a456-426614174000' },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toContain('error')
  })
})
