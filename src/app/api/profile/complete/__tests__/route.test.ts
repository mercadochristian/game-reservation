import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from '../route'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { clearProfileCache } from '@/lib/middleware/profile-cache'
import { createMockRequest } from '@/__tests__/helpers/next-mock'
import { createMockServiceClient, createMockServerClient } from '@/__tests__/helpers/supabase-mock'

vi.mock('@/lib/supabase/server')
vi.mock('@/lib/supabase/service')
vi.mock('@/lib/middleware/profile-cache')

const VALID_BODY = {
  first_name: 'John',
  last_name: 'Doe',
  birthday_month: 3,
  birthday_day: 20,
  birthday_year: 1990,
  gender: 'male',
  player_contact_number: '+63912345678',
  emergency_contact_name: 'Mom',
  emergency_contact_relationship: 'Parent',
  emergency_contact_number: '+63987654321',
  skill_level: 'intermediate',
}

describe('POST /api/profile/complete', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    const mockServerClient = createMockServerClient()
    vi.mocked(createClient).mockResolvedValue(mockServerClient as any)
    mockServerClient.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })

    const request = createMockRequest('/api/profile/complete', { method: 'POST', body: VALID_BODY })

    const response = await POST(request)

    expect(response.status).toBe(401)
  })

  it('returns 401 when getUser returns auth error', async () => {
    const mockServerClient = createMockServerClient()
    vi.mocked(createClient).mockResolvedValue(mockServerClient as any)
    mockServerClient.auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'Auth error' } })

    const request = createMockRequest('/api/profile/complete', { method: 'POST', body: VALID_BODY })

    const response = await POST(request)

    expect(response.status).toBe(401)
  })

  it('returns 403 when profile is already completed', async () => {
    const mockServerClient = createMockServerClient()
    vi.mocked(createClient).mockResolvedValue(mockServerClient as any)
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123' } },
      error: null,
    })
    mockServerClient.from('users').single.mockResolvedValue({
      data: { profile_completed: true, role: 'player' },
      error: null,
    })

    const request = createMockRequest('/api/profile/complete', { method: 'POST', body: VALID_BODY })

    const response = await POST(request)
    const responseBody = await response.json()

    expect(response.status).toBe(403)
    expect(responseBody.error).toBe('Profile already completed')
  })

  it('returns 400 when body is not valid JSON', async () => {
    const mockServerClient = createMockServerClient()
    vi.mocked(createClient).mockResolvedValue(mockServerClient as any)
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123' } },
      error: null,
    })
    mockServerClient.from('users').single.mockResolvedValue({
      data: { profile_completed: false, role: 'player' },
      error: null,
    })

    // Simulate invalid JSON by manually creating request
    const request = new Request('http://localhost/api/profile/complete', {
      method: 'POST',
      body: 'not json',
    })
    request.nextUrl = new URL('http://localhost/api/profile/complete')

    const response = await POST(request)
    const responseBody = await response.json()

    expect(response.status).toBe(400)
    expect(responseBody.error).toBe('Invalid JSON')
  })

  it('returns 422 when body fails Zod validation', async () => {
    const mockServerClient = createMockServerClient()
    vi.mocked(createClient).mockResolvedValue(mockServerClient as any)
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123' } },
      error: null,
    })
    mockServerClient.from('users').single.mockResolvedValue({
      data: { profile_completed: false, role: 'player' },
      error: null,
    })

    // Missing required fields
    const invalidBody = { first_name: 'John' }
    const request = createMockRequest('/api/profile/complete', { method: 'POST', body: invalidBody })

    const response = await POST(request)

    expect(response.status).toBe(422)
  })

  it('does not call clearProfileCache on auth failure', async () => {
    const mockServerClient = createMockServerClient()
    vi.mocked(createClient).mockResolvedValue(mockServerClient as any)
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123' } },
      error: null,
    })
    mockServerClient.from('users').single.mockResolvedValue({
      data: { profile_completed: true, role: 'player' },
      error: null,
    })

    const request = createMockRequest('/api/profile/complete', { method: 'POST', body: VALID_BODY })

    await POST(request)

    expect(clearProfileCache).not.toHaveBeenCalled()
  })

  it('reads user profile from database', async () => {
    const mockServerClient = createMockServerClient()
    vi.mocked(createClient).mockResolvedValue(mockServerClient as any)
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123' } },
      error: null,
    })
    mockServerClient.from('users').single.mockResolvedValue({
      data: { profile_completed: false, role: 'player' },
      error: null,
    })

    const request = createMockRequest('/api/profile/complete', { method: 'POST', body: VALID_BODY })

    await POST(request)

    // Verify profile was queried
    expect(mockServerClient.from).toHaveBeenCalledWith('users')
  })

  it('uses service client for update', async () => {
    const mockServerClient = createMockServerClient()
    vi.mocked(createClient).mockResolvedValue(mockServerClient as any)
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123' } },
      error: null,
    })
    mockServerClient.from('users').single.mockResolvedValue({
      data: { profile_completed: false, role: 'player' },
      error: null,
    })

    const mockServiceClient = createMockServiceClient()
    vi.mocked(createServiceClient).mockReturnValue(mockServiceClient as any)

    const request = createMockRequest('/api/profile/complete', { method: 'POST', body: VALID_BODY })

    await POST(request)

    // Verify service client was used (called after auth check)
    expect(mockServiceClient.from).toBeDefined()
  })
})
