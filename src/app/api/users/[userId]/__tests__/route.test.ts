import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PATCH } from '../route'

vi.mock('@/lib/supabase/service')
vi.mock('@/lib/supabase/server')

const CURRENT_USER_ID = '550e8400-e29b-41d4-a716-446655440000'
const TARGET_USER_ID = '660e8400-e29b-41d4-a716-446655440001'

function buildMockServerClient() {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: CURRENT_USER_ID } },
        error: null,
      }),
    },
  }
}

function buildMockServiceClient() {
  let callCount = 0
  return {
    from: vi.fn().mockImplementation((table: string) => {
      callCount++
      if (callCount === 1) {
        // First call: fetch current user
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: CURRENT_USER_ID, role: 'super_admin' },
                error: null,
              }),
            }),
          }),
        }
      } else {
        // Second call: fetch target user
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
  }
}

function makeRequest(userId: string, body: any = {}) {
  return new Request(`http://localhost:3000/api/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('PATCH /api/users/[userId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 404 when target user does not exist', async () => {
    const { createServiceClient } = await import('@/lib/supabase/service')
    const { createClient } = await import('@/lib/supabase/server')

    vi.mocked(createClient).mockResolvedValue(buildMockServerClient() as any)
    vi.mocked(createServiceClient).mockReturnValue(buildMockServiceClient() as any)

    const request = makeRequest(TARGET_USER_ID, { first_name: 'John' })
    const response = await PATCH(request, { params: { userId: TARGET_USER_ID } as any })

    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toBe('NOT_FOUND')
  })

  it('should return 401 when user is not authenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error('Not authenticated'),
        }),
      },
    } as any)

    const request = makeRequest(TARGET_USER_ID, { first_name: 'John' })
    const response = await PATCH(request, { params: { userId: TARGET_USER_ID } as any })

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('UNAUTHORIZED')
  })

  it('should return 403 when facilitator tries to edit first_name', async () => {
    const { createServiceClient } = await import('@/lib/supabase/service')
    const { createClient } = await import('@/lib/supabase/server')

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: CURRENT_USER_ID } },
          error: null,
        }),
      },
    } as any)

    let callCount = 0
    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        callCount++
        if (callCount === 1) {
          // Current user is facilitator
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: CURRENT_USER_ID, role: 'facilitator' },
                  error: null,
                }),
              }),
            }),
          }
        } else {
          // Target user exists
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: TARGET_USER_ID, first_name: 'John' },
                  error: null,
                }),
              }),
            }),
          }
        }
      }),
    } as any)

    const request = makeRequest(TARGET_USER_ID, { first_name: 'Jane' })
    const response = await PATCH(request, { params: { userId: TARGET_USER_ID } })

    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toBe('PERMISSION_DENIED')
  })

  it('should return 403 when player tries to edit themselves', async () => {
    const { createServiceClient } = await import('@/lib/supabase/service')
    const { createClient } = await import('@/lib/supabase/server')

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: CURRENT_USER_ID } },
          error: null,
        }),
      },
    } as any)

    let callCount = 0
    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        callCount++
        if (callCount === 1) {
          // Current user is player
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: CURRENT_USER_ID, role: 'player' },
                  error: null,
                }),
              }),
            }),
          }
        } else {
          // Target user is same player (self-edit)
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: CURRENT_USER_ID, role: 'player' },
                  error: null,
                }),
              }),
            }),
          }
        }
      }),
    } as any)

    const request = makeRequest(CURRENT_USER_ID, { first_name: 'Jane' })
    const response = await PATCH(request, { params: { userId: CURRENT_USER_ID } as any })

    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toBe('PERMISSION_DENIED')
  })

  it('should return 403 when admin tries to edit role of another admin', async () => {
    const { createServiceClient } = await import('@/lib/supabase/service')
    const { createClient } = await import('@/lib/supabase/server')

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: CURRENT_USER_ID } },
          error: null,
        }),
      },
    } as any)

    let callCount = 0
    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        callCount++
        if (callCount === 1) {
          // Current user is admin
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: CURRENT_USER_ID, role: 'admin' },
                  error: null,
                }),
              }),
            }),
          }
        } else {
          // Target user is also admin
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: TARGET_USER_ID, role: 'admin' },
                  error: null,
                }),
              }),
            }),
          }
        }
      }),
    } as any)

    const request = makeRequest(TARGET_USER_ID, { role: 'player' })
    const response = await PATCH(request, { params: { userId: TARGET_USER_ID } })

    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toBe('PERMISSION_DENIED')
  })

  it('should allow super_admin to edit all fields', async () => {
    const { createServiceClient } = await import('@/lib/supabase/service')
    const { createClient } = await import('@/lib/supabase/server')

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: CURRENT_USER_ID } },
          error: null,
        }),
      },
    } as any)

    let callCount = 0
    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        callCount++
        if (callCount === 1) {
          // Current user is super_admin
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: CURRENT_USER_ID, role: 'super_admin' },
                  error: null,
                }),
              }),
            }),
          }
        } else {
          // Target user exists
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: TARGET_USER_ID, role: 'player' },
                  error: null,
                }),
              }),
            }),
          }
        }
      }),
    } as any)

    const request = makeRequest(TARGET_USER_ID, { first_name: 'Jane', role: 'facilitator' })
    const response = await PATCH(request, { params: { userId: TARGET_USER_ID } as any })

    // Should pass permission checks (will return 200 for now since update logic not implemented)
    expect(response.status).toBe(200)
  })

  it('should return 400 when email is already in use by another user', async () => {
    const { createServiceClient } = await import('@/lib/supabase/service')
    const { createClient } = await import('@/lib/supabase/server')

    const OTHER_USER_ID = '770e8400-e29b-41d4-a716-446655440002'

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: CURRENT_USER_ID } },
          error: null,
        }),
      },
    } as any)

    let callCount = 0
    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        callCount++
        if (callCount === 1) {
          // Current user
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: CURRENT_USER_ID, role: 'super_admin' },
                  error: null,
                }),
              }),
            }),
          }
        } else if (callCount === 2) {
          // Target user
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: TARGET_USER_ID, email: 'old@example.com' },
                  error: null,
                }),
              }),
            }),
          }
        } else {
          // Email uniqueness check - email already in use
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ id: OTHER_USER_ID }],
                error: null,
              }),
            }),
          }
        }
      }),
    } as any)

    const request = makeRequest(TARGET_USER_ID, { email: 'taken@example.com' })
    const response = await PATCH(request, { params: { userId: TARGET_USER_ID } as any })

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('EMAIL_IN_USE')
  })

  it('should allow email update if email is not in use', async () => {
    const { createServiceClient } = await import('@/lib/supabase/service')
    const { createClient } = await import('@/lib/supabase/server')

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: CURRENT_USER_ID } },
          error: null,
        }),
      },
    } as any)

    let callCount = 0
    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        callCount++
        if (callCount === 1) {
          // Current user
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: CURRENT_USER_ID, role: 'super_admin' },
                  error: null,
                }),
              }),
            }),
          }
        } else if (callCount === 2) {
          // Target user
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: TARGET_USER_ID, email: 'old@example.com' },
                  error: null,
                }),
              }),
            }),
          }
        } else {
          // Email uniqueness check - email available
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }
        }
      }),
    } as any)

    const request = makeRequest(TARGET_USER_ID, { email: 'new@example.com' })
    const response = await PATCH(request, { params: { userId: TARGET_USER_ID } as any })

    expect(response.status).toBe(200)
  })

  it('should not check email uniqueness if email is not being changed', async () => {
    const { createServiceClient } = await import('@/lib/supabase/service')
    const { createClient } = await import('@/lib/supabase/server')

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: CURRENT_USER_ID } },
          error: null,
        }),
      },
    } as any)

    let callCount = 0
    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        callCount++
        if (callCount === 1) {
          // Current user
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: CURRENT_USER_ID, role: 'super_admin' },
                  error: null,
                }),
              }),
            }),
          }
        } else if (callCount === 2) {
          // Target user with email
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: TARGET_USER_ID, email: 'test@example.com' },
                  error: null,
                }),
              }),
            }),
          }
        } else {
          // Should NOT reach here - email check shouldn't run if email not changed
          throw new Error('Unexpected call to check email uniqueness')
        }
      }),
    } as any)

    const request = makeRequest(TARGET_USER_ID, { first_name: 'Jane' })
    const response = await PATCH(request, { params: { userId: TARGET_USER_ID } as any })

    // Should pass through to update logic, not error
    expect(response.status).toBe(200)
  })
})
