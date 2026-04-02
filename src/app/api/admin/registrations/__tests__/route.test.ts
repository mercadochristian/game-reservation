import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET } from '../route'
import { createMockRequest } from '@/__tests__/helpers/next-mock'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))

// ─── Mock builder helpers ──────────────────────────────────────────────────────

function createTableBuilder() {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  }
  builder.then = vi.fn((onFulfilled: any) =>
    Promise.resolve({ data: null, error: null }).then(onFulfilled)
  )
  builder.catch = vi.fn()
  builder.finally = vi.fn()
  return builder
}

function buildMockServiceClient() {
  const tables: Record<string, any> = {
    schedules: createTableBuilder(),
    registrations: createTableBuilder(),
    users: createTableBuilder(),
    registration_payments: createTableBuilder(),
    team_members: createTableBuilder(),
  }

  return {
    from: vi.fn((table: string) => tables[table] ?? createTableBuilder()),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  }
}

describe('GET /api/admin/registrations', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { createClient } = await import('@/lib/supabase/server')

    const usersTableBuilder = {
      ...createTableBuilder(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'admin-user', role: 'admin' },
        error: null
      }),
    }

    const mockServerClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-user' } }, error: null }),
      },
      from: vi.fn((table: string) => {
        if (table === 'users') return usersTableBuilder
        return createTableBuilder()
      }),
    }
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
    const { createServiceClient } = await import('@/lib/supabase/service')
    const mockClient = buildMockServiceClient()
    vi.mocked(createServiceClient).mockReturnValue(mockClient as any)

    const schedulesBuilder = mockClient.from('schedules') as any
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
    const { createServiceClient } = await import('@/lib/supabase/service')
    const mockClient = buildMockServiceClient()
    vi.mocked(createServiceClient).mockReturnValue(mockClient as any)

    const schedulesBuilder = mockClient.from('schedules') as any
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
    const { createServiceClient } = await import('@/lib/supabase/service')
    const mockClient = buildMockServiceClient()
    vi.mocked(createServiceClient).mockReturnValue(mockClient as any)

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

    const schedulesBuilder = mockClient.from('schedules') as any
    schedulesBuilder.then.mockImplementation((onFulfilled: any) =>
      Promise.resolve({ data: schedulesData, error: null }).then(onFulfilled)
    )

    const registrationsBuilder = mockClient.from('registrations') as any
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
    const { createServiceClient } = await import('@/lib/supabase/service')
    const mockClient = buildMockServiceClient()
    vi.mocked(createServiceClient).mockReturnValue(mockClient as any)

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

    const schedulesBuilder = mockClient.from('schedules') as any
    schedulesBuilder.then.mockImplementation((onFulfilled: any) =>
      Promise.resolve({ data: schedulesData, error: null }).then(onFulfilled)
    )

    const registrationsBuilder = mockClient.from('registrations') as any
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
    const { createServiceClient } = await import('@/lib/supabase/service')
    const mockClient = buildMockServiceClient()
    vi.mocked(createServiceClient).mockReturnValue(mockClient as any)

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

    const schedulesBuilder = mockClient.from('schedules') as any
    schedulesBuilder.then.mockImplementation((onFulfilled: any) =>
      Promise.resolve({ data: schedulesData, error: null }).then(onFulfilled)
    )

    const registrationsBuilder = mockClient.from('registrations') as any
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
    const { createServiceClient } = await import('@/lib/supabase/service')
    const mockClient = buildMockServiceClient()
    vi.mocked(createServiceClient).mockReturnValue(mockClient as any)

    const schedulesData = [
      { id: 'sched1', start_time: '2026-04-01T18:00:00Z', end_time: '2026-04-01T20:00:00Z', location_id: 'loc1', max_players: 12, created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z', locations: { id: 'loc1', name: 'A', address: '', google_map_url: '' } },
      { id: 'sched2', start_time: '2026-04-08T18:00:00Z', end_time: '2026-04-08T20:00:00Z', location_id: 'loc1', max_players: 12, created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z', locations: { id: 'loc1', name: 'A', address: '', google_map_url: '' } },
    ]
    const registrationsData = [
      { id: 'reg1', player_id: 'player1', registered_by: 'player1', schedule_id: 'sched1', preferred_position: null, created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z' },
      { id: 'reg2', player_id: 'player2', registered_by: 'player2', schedule_id: 'sched1', preferred_position: null, created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z' },
      { id: 'reg3', player_id: 'player3', registered_by: 'player3', schedule_id: 'sched2', preferred_position: null, created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z' },
    ]

    const schedulesBuilder = mockClient.from('schedules') as any
    schedulesBuilder.then.mockImplementation((onFulfilled: any) =>
      Promise.resolve({ data: schedulesData, error: null }).then(onFulfilled)
    )
    const registrationsBuilder = mockClient.from('registrations') as any
    registrationsBuilder.then.mockImplementation((onFulfilled: any) =>
      Promise.resolve({ data: registrationsData, error: null }).then(onFulfilled)
    )
    const usersBuilder = mockClient.from('users') as any
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
    const { createServiceClient } = await import('@/lib/supabase/service')
    const mockClient = buildMockServiceClient()
    vi.mocked(createServiceClient).mockReturnValue(mockClient as any)

    const schedulesData = [
      { id: 'sched1', start_time: '2026-04-01T18:00:00Z', end_time: '2026-04-01T20:00:00Z', location_id: 'loc1', max_players: 12, created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z', locations: { id: 'loc1', name: 'A', address: '', google_map_url: '' } },
    ]
    const registrationsData = [
      { id: 'reg1', player_id: 'player1', registered_by: 'player1', schedule_id: 'sched1', preferred_position: null, created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z' },
    ]
    const usersData = [
      { id: 'player1', first_name: 'Alice', last_name: 'Smith', email: 'alice@example.com', skill_level: 'intermediate', is_guest: false },
    ]

    mockClient.from('schedules').then.mockImplementation((onFulfilled: any) =>
      Promise.resolve({ data: schedulesData, error: null }).then(onFulfilled)
    )
    mockClient.from('registrations').then.mockImplementation((onFulfilled: any) =>
      Promise.resolve({ data: registrationsData, error: null }).then(onFulfilled)
    )
    mockClient.from('users').then.mockImplementation((onFulfilled: any) =>
      Promise.resolve({ data: usersData, error: null }).then(onFulfilled)
    )

    const request = createMockRequest('/api/admin/registrations?locationId=loc1')
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.registrations[0].users).toEqual(usersData[0])
  })

  it('sets users to null when player_id has no matching user', async () => {
    const { createServiceClient } = await import('@/lib/supabase/service')
    const mockClient = buildMockServiceClient()
    vi.mocked(createServiceClient).mockReturnValue(mockClient as any)

    const schedulesData = [
      { id: 'sched1', start_time: '2026-04-01T18:00:00Z', end_time: '2026-04-01T20:00:00Z', location_id: 'loc1', max_players: 12, created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z', locations: { id: 'loc1', name: 'A', address: '', google_map_url: '' } },
    ]
    const registrationsData = [
      { id: 'reg1', player_id: 'unknown-player', registered_by: 'unknown-player', schedule_id: 'sched1', preferred_position: null, created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z' },
    ]

    mockClient.from('schedules').then.mockImplementation((onFulfilled: any) =>
      Promise.resolve({ data: schedulesData, error: null }).then(onFulfilled)
    )
    mockClient.from('registrations').then.mockImplementation((onFulfilled: any) =>
      Promise.resolve({ data: registrationsData, error: null }).then(onFulfilled)
    )
    mockClient.from('users').then.mockImplementation((onFulfilled: any) =>
      Promise.resolve({ data: [], error: null }).then(onFulfilled)
    )

    const request = createMockRequest('/api/admin/registrations?locationId=loc1')
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.registrations[0].users).toBeNull()
  })

  it('sets team_members to empty array on all registrations', async () => {
    const { createServiceClient } = await import('@/lib/supabase/service')
    const mockClient = buildMockServiceClient()
    vi.mocked(createServiceClient).mockReturnValue(mockClient as any)

    const schedulesData = [
      { id: 'sched1', start_time: '2026-04-01T18:00:00Z', end_time: '2026-04-01T20:00:00Z', location_id: 'loc1', max_players: 12, created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z', locations: { id: 'loc1', name: 'A', address: '', google_map_url: '' } },
    ]
    const registrationsData = [
      { id: 'reg1', player_id: 'player1', registered_by: 'player1', schedule_id: 'sched1', preferred_position: null, created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z' },
      { id: 'reg2', player_id: 'player2', registered_by: 'player2', schedule_id: 'sched1', preferred_position: null, created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z' },
    ]

    mockClient.from('schedules').then.mockImplementation((onFulfilled: any) =>
      Promise.resolve({ data: schedulesData, error: null }).then(onFulfilled)
    )
    mockClient.from('registrations').then.mockImplementation((onFulfilled: any) =>
      Promise.resolve({ data: registrationsData, error: null }).then(onFulfilled)
    )
    mockClient.from('users').then.mockImplementation((onFulfilled: any) =>
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
    const { createServiceClient } = await import('@/lib/supabase/service')
    const mockClient = buildMockServiceClient()
    vi.mocked(createServiceClient).mockReturnValue(mockClient as any)

    const schedulesBuilder = mockClient.from('schedules') as any
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
    const { createServiceClient } = await import('@/lib/supabase/service')
    const mockClient = buildMockServiceClient()
    vi.mocked(createServiceClient).mockReturnValue(mockClient as any)

    const schedulesData = [
      { id: 'sched1', start_time: '2026-04-01T18:00:00Z', end_time: '2026-04-01T20:00:00Z', location_id: 'loc1', max_players: 12, created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z', locations: { id: 'loc1', name: 'A', address: '', google_map_url: '' } },
    ]

    mockClient.from('schedules').then.mockImplementation((onFulfilled: any) =>
      Promise.resolve({ data: schedulesData, error: null }).then(onFulfilled)
    )
    mockClient.from('registrations').then.mockImplementation((onFulfilled: any) =>
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
