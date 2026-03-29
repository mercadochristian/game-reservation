import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'

vi.mock('@/lib/supabase/service')
vi.mock('@/lib/supabase/client')

describe('POST /api/users/[userId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 404 when target user does not exist', async () => {
    const { createServiceClient } = await import('@/lib/supabase/service')
    const { createClient } = await import('@/lib/supabase/client')

    // Mock Supabase client to return auth user
    vi.mocked(createClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'current-user-id' } },
          error: null,
        }),
      },
    } as any)

    // Mock service client - setup for two from() calls
    let callCount = 0
    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        callCount++
        if (callCount === 1) {
          // First call: fetch current user
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'current-user-id', role: 'super_admin' },
                  error: null,
                }),
              }),
            }),
          }
        } else {
          // Second call: fetch target user (returns null)
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }
        }
      }),
    } as any)

    const request = new Request('http://localhost:3000/api/users/nonexistent', {
      method: 'POST',
      body: JSON.stringify({ first_name: 'John' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request, { params: { userId: 'nonexistent' } })

    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toBe('NOT_FOUND')
  })

  it('should return 401 when user is not authenticated', async () => {
    const { createClient } = await import('@/lib/supabase/client')

    vi.mocked(createClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error('Not authenticated'),
        }),
      },
    } as any)

    const request = new Request('http://localhost:3000/api/users/some-id', {
      method: 'POST',
      body: JSON.stringify({ first_name: 'John' }),
    })

    const response = await POST(request, { params: { userId: 'some-id' } })

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('UNAUTHORIZED')
  })
})
