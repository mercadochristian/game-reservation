import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET } from '../route'
import { createMockRequest } from '@/__tests__/helpers/next-mock'
import { createMockServiceClient, createMockServerClient, createQueryBuilder } from '@/__tests__/helpers/supabase-mock'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))

describe('GET /api/admin/registrations', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const mockServerClient = createMockServerClient()
    const usersBuilder = createQueryBuilder()
    usersBuilder.single.mockResolvedValue({
      data: { id: 'admin-user', role: 'admin' },
      error: null,
    })
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-user' } },
      error: null,
    })
    mockServerClient.from.mockImplementation((table: string) => {
      if (table === 'users') return usersBuilder
      return createQueryBuilder()
    })
    vi.mocked(createClient).mockResolvedValue(mockServerClient as any)
  })

  it('returns 400 when locationId is missing', async () => {
    const request = createMockRequest('/api/admin/registrations')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('Location ID required')
  })

  it('returns empty registrations when no schedules exist for location', async () => {
    const mockClient = createMockServiceClient()
    vi.mocked(createServiceClient).mockReturnValue(mockClient as any)
    const schedulesBuilder = createQueryBuilder()
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'schedules') return schedulesBuilder
      return createQueryBuilder()
    })
    schedulesBuilder.then.mockImplementation((onFulfilled: any) =>
      Promise.resolve({ data: [], error: null }).then(onFulfilled)
    )

    const request = createMockRequest('/api/admin/registrations?locationId=loc1')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.schedules).toEqual([])
    expect(body.registrations).toEqual([])
  })

  it('returns 500 when schedules query fails', async () => {
    const mockClient = createMockServiceClient()
    vi.mocked(createServiceClient).mockReturnValue(mockClient as any)
    const schedulesBuilder = createQueryBuilder()
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'schedules') return schedulesBuilder
      return createQueryBuilder()
    })
    schedulesBuilder.then.mockImplementation((onFulfilled: any) =>
      Promise.resolve({ data: null, error: { message: 'DB error' } }).then(onFulfilled)
    )

    const request = createMockRequest('/api/admin/registrations?locationId=loc1')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBeDefined()
  })


  it('returns 500 when registrations query fails', async () => {
    const mockClient = createMockServiceClient()
    vi.mocked(createServiceClient).mockReturnValue(mockClient as any)
    const schedulesBuilder = createQueryBuilder()
    const registrationsBuilder = createQueryBuilder()
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'schedules') return schedulesBuilder
      if (table === 'registrations') return registrationsBuilder
      return createQueryBuilder()
    })

    const schedulesData = [
      {
        id: 'sched1',
        start_time: '2026-04-01T18:00:00Z',
        end_time: '2026-04-01T20:00:00Z',
        location_id: 'loc1',
        max_players: 12,
        created_at: '2026-03-01T00:00:00Z',
        updated_at: '2026-03-01T00:00:00Z',
        locations: {
          id: 'loc1',
          name: 'Sports Center A',
          address: '123 Main St',
          google_map_url: 'https://maps.google.com',
        },
        registrations: [{ id: 'reg1' }],
      },
    ]

    schedulesBuilder.then.mockImplementation((onFulfilled: any) =>
      Promise.resolve({ data: schedulesData, error: null }).then(onFulfilled)
    )

    registrationsBuilder.then.mockImplementation((onFulfilled: any) =>
      Promise.resolve({ data: null, error: { message: 'Registration fetch error' } }).then(
        onFulfilled
      )
    )

    const request = createMockRequest('/api/admin/registrations?locationId=loc1')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBeDefined()
  })

  it('fetches schedules and registrations for the specified location', async () => {
    const mockClient = createMockServiceClient()
    vi.mocked(createServiceClient).mockReturnValue(mockClient as any)
    const schedulesBuilder = createQueryBuilder()
    const registrationsBuilder = createQueryBuilder()
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'schedules') return schedulesBuilder
      if (table === 'registrations') return registrationsBuilder
      return createQueryBuilder()
    })

    const schedulesData = [
      {
        id: 'sched1',
        start_time: '2026-04-01T18:00:00Z',
        end_time: '2026-04-01T20:00:00Z',
        location_id: 'loc1',
        max_players: 12,
        created_at: '2026-03-01T00:00:00Z',
        updated_at: '2026-03-01T00:00:00Z',
        locations: {
          id: 'loc1',
          name: 'Sports Center A',
          address: '123 Main St',
          google_map_url: 'https://maps.google.com',
        },
        registrations: [{ id: 'reg1' }],
      },
    ]

    schedulesBuilder.then.mockImplementation((onFulfilled: any) =>
      Promise.resolve({ data: schedulesData, error: null }).then(onFulfilled)
    )

    registrationsBuilder.then.mockImplementation((onFulfilled: any) =>
      Promise.resolve({ data: [], error: null }).then(onFulfilled)
    )

    const request = createMockRequest('/api/admin/registrations?locationId=loc1')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.schedules).toHaveLength(1)
    expect(body.registrations).toEqual([])
  })

  it('returns 500 when users query fails (fatal error)', async () => {
    const mockClient = createMockServiceClient()
    vi.mocked(createServiceClient).mockReturnValue(mockClient as any)
    const schedulesBuilder = createQueryBuilder()
    const registrationsBuilder = createQueryBuilder()
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'schedules') return schedulesBuilder
      if (table === 'registrations') return registrationsBuilder
      return createQueryBuilder()
    })

    const schedulesData = [
      {
        id: 'sched1',
        start_time: '2026-04-01T18:00:00Z',
        end_time: '2026-04-01T20:00:00Z',
        location_id: 'loc1',
        max_players: 12,
        created_at: '2026-03-01T00:00:00Z',
        updated_at: '2026-03-01T00:00:00Z',
        locations: {
          id: 'loc1',
          name: 'Sports Center A',
          address: '123 Main St',
          google_map_url: 'https://maps.google.com',
        },
        registrations: [{ id: 'reg1' }],
      },
    ]

    schedulesBuilder.then.mockImplementation((onFulfilled: any) =>
      Promise.resolve({ data: schedulesData, error: null }).then(onFulfilled)
    )

    registrationsBuilder.then.mockImplementation((onFulfilled: any) =>
      Promise.resolve({ data: null, error: { message: 'User fetch failed' } }).then(onFulfilled)
    )

    const request = createMockRequest('/api/admin/registrations?locationId=loc1')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBeDefined()
  })

  it('calculates registration_count correctly from registrations per schedule', async () => {
    const mockClient = createMockServiceClient()
    vi.mocked(createServiceClient).mockReturnValue(mockClient as any)
    const schedulesBuilder = createQueryBuilder()
    const registrationsBuilder = createQueryBuilder()
    const usersBuilder = createQueryBuilder()
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'schedules') return schedulesBuilder
      if (table === 'registrations') return registrationsBuilder
      if (table === 'users') return usersBuilder
      return createQueryBuilder()
    })

    const schedulesData = [
      { id: 'sched1', start_time: '2026-04-01T18:00:00Z', end_time: '2026-04-01T20:00:00Z', location_id: 'loc1', max_players: 12, created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z', locations: { id: 'loc1', name: 'A', address: '', google_map_url: '' } },
      { id: 'sched2', start_time: '2026-04-08T18:00:00Z', end_time: '2026-04-08T20:00:00Z', location_id: 'loc1', max_players: 12, created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z', locations: { id: 'loc1', name: 'A', address: '', google_map_url: '' } },
    ]
    const registrationsData = [
      { id: 'reg1', player_id: 'player1', registered_by: 'player1', schedule_id: 'sched1', preferred_position: null, created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z' },
      { id: 'reg2', player_id: 'player2', registered_by: 'player2', schedule_id: 'sched1', preferred_position: null, created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z' },
      { id: 'reg3', player_id: 'player3', registered_by: 'player3', schedule_id: 'sched2', preferred_position: null, created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z' },
    ]

    schedulesBuilder.then.mockImplementation((onFulfilled: any) =>
      Promise.resolve({ data: schedulesData, error: null }).then(onFulfilled)
    )
    registrationsBuilder.then.mockImplementation((onFulfilled: any) =>
      Promise.resolve({ data: registrationsData, error: null }).then(onFulfilled)
    )
    usersBuilder.then.mockImplementation((onFulfilled: any) =>
      Promise.resolve({ data: [], error: null }).then(onFulfilled)
    )

    const request = createMockRequest('/api/admin/registrations?locationId=loc1')
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    const sched1 = body.schedules.find((s: any) => s.id === 'sched1')
    const sched2 = body.schedules.find((s: any) => s.id === 'sched2')
    expect(sched1.registration_count).toBe(2)
    expect(sched2.registration_count).toBe(1)
  })

  it('attaches user data to registrations via player_id', async () => {
    const mockClient = createMockServiceClient()
    vi.mocked(createServiceClient).mockReturnValue(mockClient as any)
    const schedulesBuilder = createQueryBuilder()
    const registrationsBuilder = createQueryBuilder()
    const usersBuilder = createQueryBuilder()
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'schedules') return schedulesBuilder
      if (table === 'registrations') return registrationsBuilder
      if (table === 'users') return usersBuilder
      return createQueryBuilder()
    })

    const schedulesData = [
      { id: 'sched1', start_time: '2026-04-01T18:00:00Z', end_time: '2026-04-01T20:00:00Z', location_id: 'loc1', max_players: 12, created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z', locations: { id: 'loc1', name: 'A', address: '', google_map_url: '' } },
    ]
    const registrationsData = [
      { id: 'reg1', player_id: 'player1', registered_by: 'player1', schedule_id: 'sched1', preferred_position: null, created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z' },
    ]
    const usersData = [
      { id: 'player1', first_name: 'Alice', last_name: 'Smith', email: 'alice@example.com', skill_level: 'intermediate', is_guest: false },
    ]

    schedulesBuilder.then.mockImplementation((onFulfilled: any) =>
      Promise.resolve({ data: schedulesData, error: null }).then(onFulfilled)
    )
    registrationsBuilder.then.mockImplementation((onFulfilled: any) =>
      Promise.resolve({ data: registrationsData, error: null }).then(onFulfilled)
    )
    usersBuilder.then.mockImplementation((onFulfilled: any) =>
      Promise.resolve({ data: usersData, error: null }).then(onFulfilled)
    )

    const request = createMockRequest('/api/admin/registrations?locationId=loc1')
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.registrations[0].users).toEqual(usersData[0])
  })

  it('sets users to null when player_id has no matching user', async () => {
    const mockClient = createMockServiceClient()
    vi.mocked(createServiceClient).mockReturnValue(mockClient as any)
    const schedulesBuilder = createQueryBuilder()
    const registrationsBuilder = createQueryBuilder()
    const usersBuilder = createQueryBuilder()
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'schedules') return schedulesBuilder
      if (table === 'registrations') return registrationsBuilder
      if (table === 'users') return usersBuilder
      return createQueryBuilder()
    })

    const schedulesData = [
      { id: 'sched1', start_time: '2026-04-01T18:00:00Z', end_time: '2026-04-01T20:00:00Z', location_id: 'loc1', max_players: 12, created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z', locations: { id: 'loc1', name: 'A', address: '', google_map_url: '' } },
    ]
    const registrationsData = [
      { id: 'reg1', player_id: 'unknown-player', registered_by: 'unknown-player', schedule_id: 'sched1', preferred_position: null, created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z' },
    ]

    schedulesBuilder.then.mockImplementation((onFulfilled: any) =>
      Promise.resolve({ data: schedulesData, error: null }).then(onFulfilled)
    )
    registrationsBuilder.then.mockImplementation((onFulfilled: any) =>
      Promise.resolve({ data: registrationsData, error: null }).then(onFulfilled)
    )
    usersBuilder.then.mockImplementation((onFulfilled: any) =>
      Promise.resolve({ data: [], error: null }).then(onFulfilled)
    )

    const request = createMockRequest('/api/admin/registrations?locationId=loc1')
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.registrations[0].users).toBeNull()
  })

  it('sets team_members to empty array on all registrations', async () => {
    const mockClient = createMockServiceClient()
    vi.mocked(createServiceClient).mockReturnValue(mockClient as any)
    const schedulesBuilder = createQueryBuilder()
    const registrationsBuilder = createQueryBuilder()
    const usersBuilder = createQueryBuilder()
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'schedules') return schedulesBuilder
      if (table === 'registrations') return registrationsBuilder
      if (table === 'users') return usersBuilder
      return createQueryBuilder()
    })

    const schedulesData = [
      { id: 'sched1', start_time: '2026-04-01T18:00:00Z', end_time: '2026-04-01T20:00:00Z', location_id: 'loc1', max_players: 12, created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z', locations: { id: 'loc1', name: 'A', address: '', google_map_url: '' } },
    ]
    const registrationsData = [
      { id: 'reg1', player_id: 'player1', registered_by: 'player1', schedule_id: 'sched1', preferred_position: null, created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z' },
      { id: 'reg2', player_id: 'player2', registered_by: 'player2', schedule_id: 'sched1', preferred_position: null, created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z' },
    ]

    schedulesBuilder.then.mockImplementation((onFulfilled: any) =>
      Promise.resolve({ data: schedulesData, error: null }).then(onFulfilled)
    )
    registrationsBuilder.then.mockImplementation((onFulfilled: any) =>
      Promise.resolve({ data: registrationsData, error: null }).then(onFulfilled)
    )
    usersBuilder.then.mockImplementation((onFulfilled: any) =>
      Promise.resolve({ data: [], error: null }).then(onFulfilled)
    )

    const request = createMockRequest('/api/admin/registrations?locationId=loc1')
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.registrations[0].team_members).toEqual([])
    expect(body.registrations[1].team_members).toEqual([])
  })

  it('returns 500 when an unexpected error occurs', async () => {
    const mockClient = createMockServiceClient()
    vi.mocked(createServiceClient).mockReturnValue(mockClient as any)
    const schedulesBuilder = createQueryBuilder()
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'schedules') return schedulesBuilder
      return createQueryBuilder()
    })
    schedulesBuilder.then.mockImplementation((onFulfilled: any) =>
      Promise.resolve({ data: null, error: new Error('Unexpected DB failure') }).then(onFulfilled)
    )

    const request = createMockRequest('/api/admin/registrations?locationId=loc1')
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe('Failed to fetch registrations')
  })

  it('skips users query when there are no registrations', async () => {
    const mockClient = createMockServiceClient()
    vi.mocked(createServiceClient).mockReturnValue(mockClient as any)
    const schedulesBuilder = createQueryBuilder()
    const registrationsBuilder = createQueryBuilder()
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'schedules') return schedulesBuilder
      if (table === 'registrations') return registrationsBuilder
      return createQueryBuilder()
    })

    const schedulesData = [
      { id: 'sched1', start_time: '2026-04-01T18:00:00Z', end_time: '2026-04-01T20:00:00Z', location_id: 'loc1', max_players: 12, created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z', locations: { id: 'loc1', name: 'A', address: '', google_map_url: '' } },
    ]

    schedulesBuilder.then.mockImplementation((onFulfilled: any) =>
      Promise.resolve({ data: schedulesData, error: null }).then(onFulfilled)
    )
    registrationsBuilder.then.mockImplementation((onFulfilled: any) =>
      Promise.resolve({ data: [], error: null }).then(onFulfilled)
    )

    const request = createMockRequest('/api/admin/registrations?locationId=loc1')
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.registrations).toEqual([])
    // users table should never have been called
    expect(mockClient.from).not.toHaveBeenCalledWith('users')
  })

})
