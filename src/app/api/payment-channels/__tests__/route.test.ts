import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET } from '../route'
import { createClient } from '@/lib/supabase/server'
import { createMockRequest } from '@/__tests__/helpers/next-mock'

vi.mock('@/lib/supabase/server')

// ---------------------------------------------------------------------------
// Helper: build a Supabase server client mock for payment_channels queries.
// The route uses an async createClient(), chains .from().select().eq().order(),
// then awaits the result — so the builder must be thenable.
// ---------------------------------------------------------------------------

function buildChannelClientMock({
  data = null as unknown[] | null,
  error = null as unknown,
} = {}) {
  const qb: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
  }
  qb.then = vi.fn((onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve({ data, error }).then(onFulfilled)
  )

  return {
    from: vi.fn().mockReturnValue(qb),
  }
}

describe('GET /api/payment-channels', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // Happy path — successful query
  // -------------------------------------------------------------------------

  it('returns 200 with channels array on success', async () => {
    const channels = [
      {
        id: 'ch-1',
        name: 'GCash',
        provider: 'gcash',
        account_number: '09171234567',
        account_holder_name: 'John Doe',
        qr_code_url: null,
        is_active: true,
      },
    ]
    vi.mocked(createClient).mockResolvedValue(buildChannelClientMock({ data: channels }) as any)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ channels })
  })

  it('returns 200 with empty array when no channels exist', async () => {
    vi.mocked(createClient).mockResolvedValue(buildChannelClientMock({ data: [] }) as any)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ channels: [] })
  })

  it('returns 200 with empty array when data is null', async () => {
    vi.mocked(createClient).mockResolvedValue(buildChannelClientMock({ data: null }) as any)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ channels: [] })
  })

  // -------------------------------------------------------------------------
  // Error paths
  // -------------------------------------------------------------------------

  it('returns 500 when Supabase query returns an error', async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildChannelClientMock({ data: null, error: { message: 'DB error' } }) as any
    )

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toEqual({ error: 'Failed to fetch payment channels' })
  })

  it('returns 500 on unhandled exception', async () => {
    vi.mocked(createClient).mockRejectedValue(new Error('Unexpected crash'))

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toEqual({ error: 'Internal server error' })
  })

  // -------------------------------------------------------------------------
  // Cache-Control header — Phase 3.3 performance improvement
  // -------------------------------------------------------------------------

  describe('Cache-Control header on successful response', () => {
    it('includes Cache-Control: private, max-age=30, stale-while-revalidate=60 on 200', async () => {
      vi.mocked(createClient).mockResolvedValue(buildChannelClientMock({ data: [] }) as any)

      const response = await GET()

      expect(response.status).toBe(200)
      expect(response.headers.get('Cache-Control')).toBe(
        'private, max-age=30, stale-while-revalidate=60'
      )
    })

    it('does not include Cache-Control on 500 query error responses', async () => {
      vi.mocked(createClient).mockResolvedValue(
        buildChannelClientMock({ data: null, error: { message: 'DB error' } }) as any
      )

      const response = await GET()

      expect(response.status).toBe(500)
      expect(response.headers.get('Cache-Control')).toBeNull()
    })

    it('does not include Cache-Control on 500 exception responses', async () => {
      vi.mocked(createClient).mockRejectedValue(new Error('Unexpected crash'))

      const response = await GET()

      expect(response.status).toBe(500)
      expect(response.headers.get('Cache-Control')).toBeNull()
    })
  })
})
