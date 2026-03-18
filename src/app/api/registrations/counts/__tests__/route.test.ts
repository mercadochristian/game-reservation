import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET } from '../route'
import { createServiceClient } from '@/lib/supabase/service'
import { createMockRequest, createMockResponse } from '@/__tests__/helpers/next-mock'
import { createMockServiceClient } from '@/__tests__/helpers/supabase-mock'

vi.mock('@/lib/supabase/service')

describe('GET /api/registrations/counts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when schedule_ids param is missing', async () => {
    const request = createMockRequest('/api/registrations/counts')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toEqual({ error: 'Missing required parameter: schedule_ids' })
  })

  it('returns 400 when schedule_ids is empty string', async () => {
    const request = createMockRequest('/api/registrations/counts?schedule_ids=')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toEqual({ error: 'Missing required parameter: schedule_ids' })
  })

  it('returns 400 when schedule_ids is only whitespace', async () => {
    const request = createMockRequest('/api/registrations/counts?schedule_ids=   ')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toEqual({ error: 'Missing required parameter: schedule_ids' })
  })

  it('returns 200 with empty counts when all schedule IDs are empty after trim', async () => {
    const request = createMockRequest('/api/registrations/counts?schedule_ids=,  ,')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ counts: {}, positionCounts: {} })
  })

  it('returns 500 when Supabase query returns error', async () => {
    const mockClient = createMockServiceClient()
    vi.mocked(createServiceClient).mockReturnValue(mockClient as any)
    const qb = mockClient.from('registrations')
    ;(qb as any).then = vi.fn((onFulfilled: any) =>
      Promise.resolve({ data: null, error: { message: 'DB error' } }).then(onFulfilled)
    )

    const request = createMockRequest('/api/registrations/counts?schedule_ids=sch1')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toEqual({ error: 'Failed to fetch registration counts' })
  })

  it('returns 500 on unhandled exception', async () => {
    const mockClient = createMockServiceClient()
    vi.mocked(createServiceClient).mockReturnValue(mockClient as any)
    const qb = mockClient.from('registrations')
    ;(qb as any).then = vi.fn(() => {
      throw new Error('Unexpected error')
    })

    const request = createMockRequest('/api/registrations/counts?schedule_ids=sch1')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toEqual({ error: 'Internal server error' })
  })

  it('aggregates registrations by schedule ID', async () => {
    const mockClient = createMockServiceClient()
    vi.mocked(createServiceClient).mockReturnValue(mockClient as any)
    const data = [
      { schedule_id: 'sch1', preferred_position: 'open_spiker' },
      { schedule_id: 'sch1', preferred_position: 'open_spiker' },
      { schedule_id: 'sch1', preferred_position: 'setter' },
    ]
    const qb = mockClient.from('registrations')
    ;(qb as any).then = vi.fn((onFulfilled: any) =>
      Promise.resolve({ data, error: null }).then(onFulfilled)
    )

    const request = createMockRequest('/api/registrations/counts?schedule_ids=sch1')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.counts).toEqual({ sch1: 3 })
    expect(body.positionCounts).toEqual({
      sch1: { open_spiker: 2, setter: 1 },
    })
  })

  it('aggregates multiple schedules without cross-contamination', async () => {
    const mockClient = createMockServiceClient()
    vi.mocked(createServiceClient).mockReturnValue(mockClient as any)
    const data = [
      { schedule_id: 'sch1', preferred_position: 'open_spiker' },
      { schedule_id: 'sch1', preferred_position: 'setter' },
      { schedule_id: 'sch2', preferred_position: 'open_spiker' },
      { schedule_id: 'sch2', preferred_position: 'middle_blocker' },
      { schedule_id: 'sch2', preferred_position: 'middle_blocker' },
    ]
    const qb = mockClient.from('registrations')
    ;(qb as any).then = vi.fn((onFulfilled: any) =>
      Promise.resolve({ data, error: null }).then(onFulfilled)
    )

    const request = createMockRequest('/api/registrations/counts?schedule_ids=sch1,sch2')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.counts).toEqual({ sch1: 2, sch2: 3 })
    expect(body.positionCounts).toEqual({
      sch1: { open_spiker: 1, setter: 1 },
      sch2: { open_spiker: 1, middle_blocker: 2 },
    })
  })

  it('counts registrations with null preferred_position but does not add to positionCounts', async () => {
    const mockClient = createMockServiceClient()
    vi.mocked(createServiceClient).mockReturnValue(mockClient as any)
    const data = [
      { schedule_id: 'sch1', preferred_position: 'open_spiker' },
      { schedule_id: 'sch1', preferred_position: null },
      { schedule_id: 'sch1', preferred_position: 'setter' },
    ]
    const qb = mockClient.from('registrations')
    ;(qb as any).then = vi.fn((onFulfilled: any) =>
      Promise.resolve({ data, error: null }).then(onFulfilled)
    )

    const request = createMockRequest('/api/registrations/counts?schedule_ids=sch1')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.counts).toEqual({ sch1: 3 })
    expect(body.positionCounts).toEqual({
      sch1: { open_spiker: 1, setter: 1 },
    })
  })

  it('returns empty counts when query returns null data', async () => {
    const mockClient = createMockServiceClient()
    vi.mocked(createServiceClient).mockReturnValue(mockClient as any)
    const qb = mockClient.from('registrations')
    ;(qb as any).then = vi.fn((onFulfilled: any) =>
      Promise.resolve({ data: null, error: null }).then(onFulfilled)
    )

    const request = createMockRequest('/api/registrations/counts?schedule_ids=sch1')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ counts: {}, positionCounts: {} })
  })

  it('returns empty counts when query returns empty array', async () => {
    const mockClient = createMockServiceClient()
    vi.mocked(createServiceClient).mockReturnValue(mockClient as any)
    const qb = mockClient.from('registrations')
    ;(qb as any).then = vi.fn((onFulfilled: any) =>
      Promise.resolve({ data: [], error: null }).then(onFulfilled)
    )

    const request = createMockRequest('/api/registrations/counts?schedule_ids=sch1')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ counts: {}, positionCounts: {} })
  })

  it('trims whitespace from schedule IDs', async () => {
    const mockClient = createMockServiceClient()
    vi.mocked(createServiceClient).mockReturnValue(mockClient as any)
    const qb = mockClient.from('registrations')
    ;(qb as any).then = vi.fn((onFulfilled: any) =>
      Promise.resolve({ data: [], error: null }).then(onFulfilled)
    )

    const request = createMockRequest('/api/registrations/counts?schedule_ids= sch1 , sch2 ')

    const response = await GET(request)

    // Check that .in() was called with trimmed values
    const selectCall = qb.select as any
    const inCall = qb.in as any
    const chainedQb = selectCall.mock.results[0]?.value
    expect(inCall).toHaveBeenCalledWith('schedule_id', ['sch1', 'sch2'])

    expect(response.status).toBe(200)
  })
})
