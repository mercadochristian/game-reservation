import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GET } from '../route'
import { createMockRequest } from '@/__tests__/helpers/next-mock'
import { createMockServerClient } from '@/__tests__/helpers/supabase-mock'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('GET /api/users/search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when q is less than 2 characters', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const mockClient = createMockServerClient()
    vi.mocked(createClient).mockResolvedValue(mockClient as any)

    const request = createMockRequest('/api/users/search?q=a')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBeDefined()
  })

  it('returns 400 when q is empty', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const mockClient = createMockServerClient()
    vi.mocked(createClient).mockResolvedValue(mockClient as any)

    const request = createMockRequest('/api/users/search?q=')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBeDefined()
  })

  it('returns 400 when q contains invalid characters like %', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const mockClient = createMockServerClient()
    vi.mocked(createClient).mockResolvedValue(mockClient as any)

    const request = createMockRequest('/api/users/search?q=test%25')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBeDefined()
  })

  it('returns 400 when q contains invalid characters like semicolon', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const mockClient = createMockServerClient()
    vi.mocked(createClient).mockResolvedValue(mockClient as any)

    const request = createMockRequest('/api/users/search?q=test;drop')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBeDefined()
  })


  it('returns 401 when no authenticated user', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const mockClient = createMockServerClient()
    vi.mocked(createClient).mockResolvedValue(mockClient as any)
    mockClient.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })

    const request = createMockRequest('/api/users/search?q=john')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBeDefined()
  })

  it('returns 500 when Supabase query returns error', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const mockClient = createMockServerClient()
    vi.mocked(createClient).mockResolvedValue(mockClient as any)
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123', email: 'test@example.com' } },
      error: null,
    })

    const qb = mockClient.from('users')
    ;(qb as any).then = vi.fn((onFulfilled: any) =>
      Promise.resolve({ data: null, error: { message: 'DB error' } }).then(onFulfilled)
    )

    const request = createMockRequest('/api/users/search?q=john')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBeDefined()
  })

  it('returns 200 with empty array when no results', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const mockClient = createMockServerClient()
    vi.mocked(createClient).mockResolvedValue(mockClient as any)
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123', email: 'test@example.com' } },
      error: null,
    })

    const qb = mockClient.from('users')
    ;(qb as any).then = vi.fn((onFulfilled: any) =>
      Promise.resolve({ data: [], error: null }).then(onFulfilled)
    )

    const request = createMockRequest('/api/users/search?q=nonexistent')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual([])
  })

  it('returns 200 with empty array when data is null', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const mockClient = createMockServerClient()
    vi.mocked(createClient).mockResolvedValue(mockClient as any)
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123', email: 'test@example.com' } },
      error: null,
    })

    const qb = mockClient.from('users')
    ;(qb as any).then = vi.fn((onFulfilled: any) =>
      Promise.resolve({ data: null, error: null }).then(onFulfilled)
    )

    const request = createMockRequest('/api/users/search?q=john')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual([])
  })

  it('returns 200 with user list on valid query', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const mockClient = createMockServerClient()
    vi.mocked(createClient).mockResolvedValue(mockClient as any)
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123', email: 'test@example.com' } },
      error: null,
    })

    const users = [
      { id: 'john1', first_name: 'John', last_name: 'Doe', email: 'john@example.com', skill_level: 'intermediate' },
      { id: 'john2', first_name: 'John', last_name: 'Smith', email: 'jsmith@example.com', skill_level: 'advanced' },
    ]
    const qb = mockClient.from('users')
    ;(qb as any).then = vi.fn((onFulfilled: any) =>
      Promise.resolve({ data: users, error: null }).then(onFulfilled)
    )

    const request = createMockRequest('/api/users/search?q=john')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual(users)
  })

  it('accepts valid characters in search query including @ symbol', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const mockClient = createMockServerClient()
    vi.mocked(createClient).mockResolvedValue(mockClient as any)
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123', email: 'test@example.com' } },
      error: null,
    })

    const qb = mockClient.from('users')
    ;(qb as any).then = vi.fn((onFulfilled: any) =>
      Promise.resolve({ data: [], error: null }).then(onFulfilled)
    )

    const request = createMockRequest('/api/users/search?q=user@example.com')

    const response = await GET(request)

    expect(response.status).toBe(200)
  })

  it('accepts valid characters in search query including apostrophe', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const mockClient = createMockServerClient()
    vi.mocked(createClient).mockResolvedValue(mockClient as any)
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123', email: 'test@example.com' } },
      error: null,
    })

    const qb = mockClient.from('users')
    ;(qb as any).then = vi.fn((onFulfilled: any) =>
      Promise.resolve({ data: [], error: null }).then(onFulfilled)
    )

    const request = createMockRequest('/api/users/search?q=O\'Brien')

    const response = await GET(request)

    expect(response.status).toBe(200)
  })

  it('accepts valid characters in search query including plus sign', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const mockClient = createMockServerClient()
    vi.mocked(createClient).mockResolvedValue(mockClient as any)
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123', email: 'test@example.com' } },
      error: null,
    })

    const qb = mockClient.from('users')
    ;(qb as any).then = vi.fn((onFulfilled: any) =>
      Promise.resolve({ data: [], error: null }).then(onFulfilled)
    )

    const request = createMockRequest('/api/users/search?q=+63912345678')

    const response = await GET(request)

    expect(response.status).toBe(200)
  })

  it('accepts valid characters in search query including underscore', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const mockClient = createMockServerClient()
    vi.mocked(createClient).mockResolvedValue(mockClient as any)
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123', email: 'test@example.com' } },
      error: null,
    })

    const qb = mockClient.from('users')
    ;(qb as any).then = vi.fn((onFulfilled: any) =>
      Promise.resolve({ data: [], error: null }).then(onFulfilled)
    )

    const request = createMockRequest('/api/users/search?q=john_doe')

    const response = await GET(request)

    expect(response.status).toBe(200)
  })

  it('trims whitespace from search query', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const mockClient = createMockServerClient()
    vi.mocked(createClient).mockResolvedValue(mockClient as any)
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123', email: 'test@example.com' } },
      error: null,
    })

    const qb = mockClient.from('users')
    ;(qb as any).then = vi.fn((onFulfilled: any) =>
      Promise.resolve({ data: [], error: null }).then(onFulfilled)
    )

    const request = createMockRequest('/api/users/search?q=  john  ')

    const response = await GET(request)

    expect(response.status).toBe(200)
  })

  it('handles unhandled exception gracefully', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const mockClient = createMockServerClient()
    vi.mocked(createClient).mockResolvedValue(mockClient as any)
    mockClient.auth.getUser.mockRejectedValue(new Error('Unexpected error'))

    const request = createMockRequest('/api/users/search?q=john')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBeDefined()
  })
})
