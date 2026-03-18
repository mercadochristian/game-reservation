import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET } from '../route'
import { createServiceClient } from '@/lib/supabase/service'
import { createMockRequest } from '@/__tests__/helpers/next-mock'
import { createMockServiceClient } from '@/__tests__/helpers/supabase-mock'

vi.mock('@/lib/supabase/service')

describe('GET /api/registrations/by-position', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when schedule_id is missing', async () => {
    const request = createMockRequest('/api/registrations/by-position?position=open_spiker')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBeDefined()
  })

  it('returns 400 when position is missing', async () => {
    const request = createMockRequest('/api/registrations/by-position?schedule_id=sch1')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBeDefined()
  })

  it('returns 400 when both params are missing', async () => {
    const request = createMockRequest('/api/registrations/by-position')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBeDefined()
  })

  it('returns 400 when schedule_id is empty after trim', async () => {
    const request = createMockRequest('/api/registrations/by-position?schedule_id=   &position=open_spiker')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBeDefined()
  })

  it('returns 400 when position is empty after trim', async () => {
    const request = createMockRequest('/api/registrations/by-position?schedule_id=sch1&position=   ')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBeDefined()
  })

  it('returns 500 when Supabase query returns error', async () => {
    const mockClient = createMockServiceClient()
    vi.mocked(createServiceClient).mockReturnValue(mockClient as any)
    const qb = mockClient.from('registrations')
    ;(qb as any).then = vi.fn((onFulfilled: any) =>
      Promise.resolve({ data: null, error: { message: 'DB error' } }).then(onFulfilled)
    )

    const request = createMockRequest(
      '/api/registrations/by-position?schedule_id=sch1&position=open_spiker'
    )

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBeDefined()
  })

  it('returns 500 on unhandled exception', async () => {
    const mockClient = createMockServiceClient()
    vi.mocked(createServiceClient).mockReturnValue(mockClient as any)
    const qb = mockClient.from('registrations')
    ;(qb as any).then = vi.fn(() => {
      throw new Error('Unexpected error')
    })

    const request = createMockRequest(
      '/api/registrations/by-position?schedule_id=sch1&position=open_spiker'
    )

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBeDefined()
  })

  it('returns 200 with empty array when no registrations found', async () => {
    const mockClient = createMockServiceClient()
    vi.mocked(createServiceClient).mockReturnValue(mockClient as any)
    const qb = mockClient.from('registrations')
    ;(qb as any).then = vi.fn((onFulfilled: any) =>
      Promise.resolve({ data: [], error: null }).then(onFulfilled)
    )

    const request = createMockRequest(
      '/api/registrations/by-position?schedule_id=sch1&position=open_spiker'
    )

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual([])
  })

  it('returns 200 with empty array when data is null', async () => {
    const mockClient = createMockServiceClient()
    vi.mocked(createServiceClient).mockReturnValue(mockClient as any)
    const qb = mockClient.from('registrations')
    ;(qb as any).then = vi.fn((onFulfilled: any) =>
      Promise.resolve({ data: null, error: null }).then(onFulfilled)
    )

    const request = createMockRequest(
      '/api/registrations/by-position?schedule_id=sch1&position=open_spiker'
    )

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual([])
  })

  it('returns players extracted from joined users', async () => {
    const mockClient = createMockServiceClient()
    vi.mocked(createServiceClient).mockReturnValue(mockClient as any)
    const data = [
      {
        schedule_id: 'sch1',
        preferred_position: 'open_spiker',
        users: { first_name: 'John', last_name: 'Doe' },
      },
      {
        schedule_id: 'sch1',
        preferred_position: 'open_spiker',
        users: { first_name: 'Jane', last_name: 'Smith' },
      },
    ]
    const qb = mockClient.from('registrations')
    ;(qb as any).then = vi.fn((onFulfilled: any) =>
      Promise.resolve({ data, error: null }).then(onFulfilled)
    )

    const request = createMockRequest(
      '/api/registrations/by-position?schedule_id=sch1&position=open_spiker'
    )

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual([
      { first_name: 'John', last_name: 'Doe' },
      { first_name: 'Jane', last_name: 'Smith' },
    ])
  })

  it('returns null player names when users is null', async () => {
    const mockClient = createMockServiceClient()
    vi.mocked(createServiceClient).mockReturnValue(mockClient as any)
    const data = [
      {
        schedule_id: 'sch1',
        preferred_position: 'open_spiker',
        users: null,
      },
      {
        schedule_id: 'sch1',
        preferred_position: 'open_spiker',
        users: { first_name: 'John', last_name: 'Doe' },
      },
    ]
    const qb = mockClient.from('registrations')
    ;(qb as any).then = vi.fn((onFulfilled: any) =>
      Promise.resolve({ data, error: null }).then(onFulfilled)
    )

    const request = createMockRequest(
      '/api/registrations/by-position?schedule_id=sch1&position=open_spiker'
    )

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual([
      { first_name: null, last_name: null },
      { first_name: 'John', last_name: 'Doe' },
    ])
  })

  it('returns partial user data when first_name is missing', async () => {
    const mockClient = createMockServiceClient()
    vi.mocked(createServiceClient).mockReturnValue(mockClient as any)
    const data = [
      {
        schedule_id: 'sch1',
        preferred_position: 'open_spiker',
        users: { first_name: undefined, last_name: 'Doe' },
      },
    ]
    const qb = mockClient.from('registrations')
    ;(qb as any).then = vi.fn((onFulfilled: any) =>
      Promise.resolve({ data, error: null }).then(onFulfilled)
    )

    const request = createMockRequest(
      '/api/registrations/by-position?schedule_id=sch1&position=open_spiker'
    )

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual([
      { first_name: null, last_name: 'Doe' },
    ])
  })

  it('trims whitespace from schedule_id and position', async () => {
    const mockClient = createMockServiceClient()
    vi.mocked(createServiceClient).mockReturnValue(mockClient as any)
    const qb = mockClient.from('registrations')
    ;(qb as any).then = vi.fn((onFulfilled: any) =>
      Promise.resolve({ data: [], error: null }).then(onFulfilled)
    )

    const request = createMockRequest(
      '/api/registrations/by-position?schedule_id= sch1 &position= open_spiker '
    )

    const response = await GET(request)

    // Verify the route processed it (at least got to the point where it queries)
    expect(response.status).toBe(200)
  })
})
