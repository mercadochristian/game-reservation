import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from '../route'
import { createMockRequest } from '@/__tests__/helpers/next-mock'
import { createMockServiceClient, createMockServerClient, createQueryBuilder } from '@/__tests__/helpers/supabase-mock'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// Global setup (src/__tests__/setup.ts) auto-mocks these modules.
// Per-test configuration is done via vi.mocked(...).mockResolvedValue(...).
vi.mock('@/lib/services/guest-user')

// ─── RFC 4122 valid UUIDs ──────────────────────────────────────────────────────
// Zod v4 enforces strict RFC 4122 UUID format: version [1-8], variant [89abAB].
// Pattern: a0a0a0aX-a0a0-4a0a-8a0a-a0a0a0a0a0XX
const SCH_ID   = 'a0a0a0a0-a0a0-4a0a-8a0a-a0a0a0a0a000'
const USER1_ID = 'a0a0a0a1-a0a0-4a0a-8a0a-a0a0a0a0a001'
const USER2_ID = 'a0a0a0a2-a0a0-4a0a-8a0a-a0a0a0a0a002'
const AUTH_ID  = 'a0a0a0a9-a0a0-4a0a-8a0a-a0a0a0a0a009'
const TEAM_ID  = 'a0a0a0a8-a0a0-4a0a-8a0a-a0a0a0a0a008'

// ─── Valid request bodies ──────────────────────────────────────────────────────

const validSingleBody = {
  registration_mode: 'single' as const,
  schedule_id: SCH_ID,
  payment_status: 'paid' as const,
  team_preference: 'shuffle' as const,
  players: [
    { type: 'existing' as const, user_id: USER1_ID, preferred_position: 'open_spiker' as const },
  ],
}

const validGroupBody = {
  registration_mode: 'group' as const,
  schedule_id: SCH_ID,
  payment_status: 'paid' as const,
  team_preference: 'shuffle' as const,
  players: [
    { type: 'existing' as const, user_id: USER1_ID, preferred_position: 'open_spiker' as const },
    { type: 'existing' as const, user_id: USER2_ID, preferred_position: 'setter' as const },
  ],
}

// ─── Mock builder helpers ──────────────────────────────────────────────────────

function buildMockClients() {
  const serverTables: Record<string, any> = {
    users: createQueryBuilder(),
    registrations: createQueryBuilder(),
    teams: createQueryBuilder(),
    team_members: createQueryBuilder(),
  }
  const serviceTables: Record<string, any> = {
    users: createQueryBuilder(),
    schedules: createQueryBuilder(),
    registrations: createQueryBuilder(),
    teams: createQueryBuilder(),
    team_members: createQueryBuilder(),
  }

  const serverClient = createMockServerClient()
  serverClient.from.mockImplementation((table: string) => serverTables[table] ?? createQueryBuilder())

  const serviceClient = createMockServiceClient()
  serviceClient.from.mockImplementation((table: string) => serviceTables[table] ?? createQueryBuilder())

  vi.mocked(createClient).mockResolvedValue(serverClient as any)
  vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)

  return {
    serverClient,
    serviceClient,
    tables: { server: serverTables, service: serviceTables },
  }
}

function makeRequest(body: object) {
  return createMockRequest('http://localhost/api/admin/register', {
    method: 'POST',
    body,
  })
}

// ─── Helper to add schedule mock ───────────────────────────────────────────────

function addScheduleMock(tables: { service: Record<string, any> }) {
  tables.service.schedules.single.mockResolvedValueOnce({
    data: { position_prices: {}, team_price: 1000 },
    error: null,
  })
}

// ─── Shared setup helpers ─────────────────────────────────────────────────────

function setupSinglePlayerHappyPath(
  serverClient: any,
  tables: { server: Record<string, any>; service: Record<string, any> },
  adminRole: 'admin' | 'super_admin' = 'admin'
) {
  serverClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_ID } }, error: null })
  tables.server.users.single
    // Admin role check
    .mockResolvedValueOnce({ data: { role: adminRole }, error: null })
    // Player resolution
    .mockResolvedValueOnce({ data: { id: USER1_ID }, error: null })

  tables.service.schedules.single.mockResolvedValueOnce({
    data: { position_prices: {}, team_price: 1000 },
    error: null,
  })

  tables.server.registrations.then = vi.fn((onFulfilled: any) =>
    Promise.resolve({ data: [], error: null }).then(onFulfilled)
  )
  tables.service.registrations.then = vi.fn((onFulfilled: any) =>
    Promise.resolve({ data: [{ id: 'reg-1', player_id: USER1_ID }], error: null }).then(onFulfilled)
  )
}

function setupGroupHappyPath(
  serverClient: any,
  tables: { server: Record<string, any>; service: Record<string, any> }
) {
  serverClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_ID } }, error: null })
  tables.server.users.single
    .mockResolvedValueOnce({ data: { role: 'admin' }, error: null })
    .mockResolvedValueOnce({ data: { id: USER1_ID }, error: null })
    .mockResolvedValueOnce({ data: { id: USER2_ID }, error: null })
    // Registrant name for team naming
    .mockResolvedValueOnce({ data: { first_name: 'Alice' }, error: null })

  tables.service.schedules.single.mockResolvedValueOnce({
    data: { position_prices: {}, team_price: 1000 },
    error: null,
  })

  tables.server.registrations.then = vi.fn((onFulfilled: any) =>
    Promise.resolve({ data: [], error: null }).then(onFulfilled)
  )
  tables.service.registrations.then = vi.fn((onFulfilled: any) =>
    Promise.resolve({
      data: [{ id: 'reg-1', player_id: USER1_ID }, { id: 'reg-2', player_id: USER2_ID }],
      error: null,
    }).then(onFulfilled)
  )
  tables.service.teams.single.mockResolvedValueOnce({ data: { id: TEAM_ID }, error: null })
  tables.service.team_members.then = vi.fn((onFulfilled: any) =>
    Promise.resolve({ data: null, error: null }).then(onFulfilled)
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/admin/register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Validation ───────────────────────────────────────────────────────────────

  describe('Validation', () => {
    it('rejects completely invalid schema (bad mode, non-UUID schedule, empty players)', async () => {
      const request = makeRequest({
        registration_mode: 'invalid',
        schedule_id: 'not-uuid',
        players: [],
      })

      const response = await POST(request as any)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body).toHaveProperty('error', 'Invalid request body')
      expect(body.issues).toBeDefined()
    })

    it('rejects when schedule_id is not a valid UUID', async () => {
      const request = makeRequest({ ...validSingleBody, schedule_id: 'not-a-uuid' })
      const response = await POST(request as any)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Invalid request body')
    })

    it('rejects when players array is empty (Zod schema min 1)', async () => {
      const request = makeRequest({ ...validSingleBody, players: [] })
      const response = await POST(request as any)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Invalid request body')
    })

    it('rejects invalid payment_status value', async () => {
      const request = makeRequest({ ...validSingleBody, payment_status: 'unknown' })
      const response = await POST(request as any)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Invalid request body')
    })

    it('rejects invalid team_preference value', async () => {
      const request = makeRequest({ ...validSingleBody, team_preference: 'random' })
      const response = await POST(request as any)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Invalid request body')
    })

    it('accepts request without payment_status (defaults to pending)', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const { serverClient, serviceClient, tables } = buildMockClients()
      vi.mocked(createClient).mockResolvedValue(serverClient as any)
      vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)
      setupSinglePlayerHappyPath(serverClient, tables)

      const { payment_status: _omit, ...bodyWithoutStatus } = validSingleBody
      const request = makeRequest(bodyWithoutStatus)
      const response = await POST(request as any)

      expect(response.status).toBe(200)
    })
  })

  // ── Authentication ────────────────────────────────────────────────────────────

  describe('Authentication', () => {
    it('returns 401 when user is not authenticated', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const { serverClient, serviceClient } = buildMockClients()
      vi.mocked(createClient).mockResolvedValue(serverClient as any)
      vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)
      serverClient.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })

      const request = makeRequest(validSingleBody)
      const response = await POST(request as any)

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
    })
  })

  // ── Authorization ─────────────────────────────────────────────────────────────

  describe('Authorization', () => {
    it('returns 403 for a player role user', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const { serverClient, serviceClient, tables } = buildMockClients()
      vi.mocked(createClient).mockResolvedValue(serverClient as any)
      vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)
      serverClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_ID } }, error: null })
      tables.server.users.single.mockResolvedValueOnce({ data: { role: 'player' }, error: null })

      const request = makeRequest(validSingleBody)
      const response = await POST(request as any)

      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error).toContain('Only admins')
    })

    it('returns 403 for a facilitator role user', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const { serverClient, serviceClient, tables } = buildMockClients()
      vi.mocked(createClient).mockResolvedValue(serverClient as any)
      vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)
      serverClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_ID } }, error: null })
      tables.server.users.single.mockResolvedValueOnce({ data: { role: 'facilitator' }, error: null })

      const request = makeRequest(validSingleBody)
      const response = await POST(request as any)

      expect(response.status).toBe(403)
    })

    it('returns 403 when role lookup returns a DB error', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const { serverClient, serviceClient, tables } = buildMockClients()
      vi.mocked(createClient).mockResolvedValue(serverClient as any)
      vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)
      serverClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_ID } }, error: null })
      tables.server.users.single.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } })

      const request = makeRequest(validSingleBody)
      const response = await POST(request as any)

      expect(response.status).toBe(403)
    })

    it('allows admin role user through', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const { serverClient, serviceClient, tables } = buildMockClients()
      vi.mocked(createClient).mockResolvedValue(serverClient as any)
      vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)
      setupSinglePlayerHappyPath(serverClient, tables, 'admin')

      const request = makeRequest(validSingleBody)
      const response = await POST(request as any)

      expect(response.status).toBe(200)
    })

    it('allows super_admin role user through', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const { serverClient, serviceClient, tables } = buildMockClients()
      vi.mocked(createClient).mockResolvedValue(serverClient as any)
      vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)
      setupSinglePlayerHappyPath(serverClient, tables, 'super_admin')

      const request = makeRequest(validSingleBody)
      const response = await POST(request as any)

      expect(response.status).toBe(200)
    })
  })

  // ── Player resolution ─────────────────────────────────────────────────────────

  describe('Player Resolution', () => {
    it('resolves an existing player and returns success result', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const { serverClient, serviceClient, tables } = buildMockClients()
      vi.mocked(createClient).mockResolvedValue(serverClient as any)
      vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)
      setupSinglePlayerHappyPath(serverClient, tables)

      const request = makeRequest(validSingleBody)
      const response = await POST(request as any)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.results[0].success).toBe(true)
      expect(body.results[0].user_id).toBe(USER1_ID)
    })

    it('returns 400 with error result when player user_id is not found', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const { serverClient, serviceClient, tables } = buildMockClients()
      vi.mocked(createClient).mockResolvedValue(serverClient as any)
      vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)
      serverClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_ID } }, error: null })
      tables.server.users.single
        .mockResolvedValueOnce({ data: { role: 'admin' }, error: null })
        .mockResolvedValueOnce({ data: null, error: null })
      addScheduleMock(tables)

      const request = makeRequest(validSingleBody)
      const response = await POST(request as any)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.results[0].success).toBe(false)
      expect(body.results[0].error).toContain('User not found')
    })

    it('returns 400 when player lookup returns a DB error', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const { serverClient, serviceClient, tables } = buildMockClients()
      vi.mocked(createClient).mockResolvedValue(serverClient as any)
      vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)
      serverClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_ID } }, error: null })
      tables.server.users.single
        .mockResolvedValueOnce({ data: { role: 'admin' }, error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'timeout' } })
      addScheduleMock(tables)

      const request = makeRequest(validSingleBody)
      const response = await POST(request as any)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.results[0].success).toBe(false)
      expect(body.results[0].error).toContain('User not found')
    })

    it('calls createGuestUser for a guest player type', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const { createGuestUser } = await import('@/lib/services/guest-user')
      const { serverClient, serviceClient, tables } = buildMockClients()
      vi.mocked(createClient).mockResolvedValue(serverClient as any)
      vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)
      serverClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_ID } }, error: null })
      tables.server.users.single.mockResolvedValueOnce({ data: { role: 'admin' }, error: null })
      // Need to mock schedule twice: once for validation, once for team price check
      tables.service.schedules.single.mockResolvedValueOnce({
        data: { position_prices: {}, team_price: 1000 },
        error: null,
      }).mockResolvedValueOnce({
        data: { position_prices: {}, team_price: 1000 },
        error: null,
      })
      vi.mocked(createGuestUser).mockResolvedValueOnce({ user_id: USER1_ID, error: null, reused: false })

      tables.server.registrations.then = vi.fn((onFulfilled: any) =>
        Promise.resolve({ data: [], error: null }).then(onFulfilled)
      )
      tables.service.registrations.then = vi.fn((onFulfilled: any) =>
        Promise.resolve({ data: [{ id: 'reg-1', player_id: USER1_ID }], error: null }).then(onFulfilled)
      )

      const guestBody = {
        ...validSingleBody,
        players: [{
          type: 'guest' as const,
          first_name: 'Jane',
          last_name: 'Doe',
          email: 'jane@example.com',
          skill_level: 'intermediate' as const,
          preferred_position: 'open_spiker' as const,
        }],
      }

      const request = makeRequest(guestBody)
      const response = await POST(request as any)

      const body = await response.json()
      if (response.status !== 200) {
        console.error('Expected 200 but got', response.status, 'Body:', JSON.stringify(body, null, 2))
      }
      expect(response.status).toBe(200)
      expect(vi.mocked(createGuestUser)).toHaveBeenCalledOnce()
      expect(body.results[0].success).toBe(true)
    })

    it('returns 400 when createGuestUser returns an error', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const { createGuestUser } = await import('@/lib/services/guest-user')
      const { serverClient, serviceClient, tables } = buildMockClients()
      vi.mocked(createClient).mockResolvedValue(serverClient as any)
      vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)
      serverClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_ID } }, error: null })
      tables.server.users.single.mockResolvedValueOnce({ data: { role: 'admin' }, error: null })
      tables.service.schedules.single.mockResolvedValueOnce({
        data: { position_prices: {}, team_price: 1000 },
        error: null,
      }).mockResolvedValueOnce({
        data: { position_prices: {}, team_price: 1000 },
        error: null,
      })
      vi.mocked(createGuestUser).mockResolvedValueOnce({
        user_id: null,
        error: 'Failed to create account. Please try again.',
        reused: false,
      })

      const guestBody = {
        ...validSingleBody,
        players: [{
          type: 'guest' as const,
          first_name: 'Bad',
          last_name: 'Guest',
          email: 'bad@example.com',
          skill_level: 'intermediate' as const,
          preferred_position: 'open_spiker' as const,
        }],
      }

      const request = makeRequest(guestBody)
      const response = await POST(request as any)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.results[0].success).toBe(false)
      expect(body.results[0].error).toContain('Failed to create account')
    })
  })

  // ── Duplicate detection ───────────────────────────────────────────────────────

  describe('Duplicate Detection', () => {
    it('returns 400 with per-player error when player is already registered', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const { serverClient, serviceClient, tables } = buildMockClients()
      vi.mocked(createClient).mockResolvedValue(serverClient as any)
      vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)
      serverClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_ID } }, error: null })
      tables.server.users.single
        .mockResolvedValueOnce({ data: { role: 'admin' }, error: null })
        .mockResolvedValueOnce({ data: { id: USER1_ID }, error: null })
      addScheduleMock(tables)

      tables.server.registrations.then = vi.fn((onFulfilled: any) =>
        Promise.resolve({ data: [{ player_id: USER1_ID }], error: null }).then(onFulfilled)
      )

      const request = makeRequest(validSingleBody)
      const response = await POST(request as any)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.results[0].success).toBe(false)
      expect(body.results[0].error).toContain('Already registered')
    })

    it('marks only the duplicate player as failed in a mixed batch', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const { serverClient, serviceClient, tables } = buildMockClients()
      vi.mocked(createClient).mockResolvedValue(serverClient as any)
      vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)
      serverClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_ID } }, error: null })
      tables.server.users.single
        .mockResolvedValueOnce({ data: { role: 'admin' }, error: null })
        .mockResolvedValueOnce({ data: { id: USER1_ID }, error: null })
        .mockResolvedValueOnce({ data: { id: USER2_ID }, error: null })
      addScheduleMock(tables)

      // Only USER1 is a duplicate
      tables.server.registrations.then = vi.fn((onFulfilled: any) =>
        Promise.resolve({ data: [{ player_id: USER1_ID }], error: null }).then(onFulfilled)
      )

      const request = makeRequest(validGroupBody)
      const response = await POST(request as any)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.results[0].success).toBe(false)
      expect(body.results[0].error).toContain('Already registered')
      expect(body.results[1].success).toBe(true)
    })
  })

  // ── Batch insert errors ───────────────────────────────────────────────────────

  describe('Batch Insert Errors', () => {
    it('returns 500 when registrations batch insert fails', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const { serverClient, serviceClient, tables } = buildMockClients()
      vi.mocked(createClient).mockResolvedValue(serverClient as any)
      vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)
      serverClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_ID } }, error: null })
      tables.server.users.single
        .mockResolvedValueOnce({ data: { role: 'admin' }, error: null })
        .mockResolvedValueOnce({ data: { id: USER1_ID }, error: null })
      addScheduleMock(tables)

      tables.server.registrations.then = vi.fn((onFulfilled: any) =>
        Promise.resolve({ data: [], error: null }).then(onFulfilled)
      )
      tables.service.registrations.then = vi.fn((onFulfilled: any) =>
        Promise.resolve({ data: null, error: { message: 'unique constraint violation' } }).then(onFulfilled)
      )

      const request = makeRequest(validSingleBody)
      const response = await POST(request as any)

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toContain('Registration failed')
    })
  })

  // ── Registration modes ────────────────────────────────────────────────────────

  describe('Registration Modes', () => {
    it('does not create team or team_members for single mode', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const { serverClient, serviceClient, tables } = buildMockClients()
      vi.mocked(createClient).mockResolvedValue(serverClient as any)
      vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)
      setupSinglePlayerHappyPath(serverClient, tables)

      const request = makeRequest(validSingleBody)
      const response = await POST(request as any)

      expect(response.status).toBe(200)
      expect(tables.service.teams.insert).not.toHaveBeenCalled()
      expect(tables.service.team_members.insert).not.toHaveBeenCalled()
    })

    it('creates team and team_members for group mode', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const { serverClient, serviceClient, tables } = buildMockClients()
      vi.mocked(createClient).mockResolvedValue(serverClient as any)
      vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)
      setupGroupHappyPath(serverClient, tables)

      const request = makeRequest(validGroupBody)
      const response = await POST(request as any)

      expect(response.status).toBe(200)
      expect(tables.service.teams.insert).toHaveBeenCalled()
      expect(tables.service.team_members.insert).toHaveBeenCalled()
    })

    it('creates team and team_members for team mode', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const { serverClient, serviceClient, tables } = buildMockClients()
      vi.mocked(createClient).mockResolvedValue(serverClient as any)
      vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)
      serverClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_ID } }, error: null })
      tables.server.users.single
        .mockResolvedValueOnce({ data: { role: 'admin' }, error: null })
        .mockResolvedValueOnce({ data: { id: USER1_ID }, error: null })
        .mockResolvedValueOnce({ data: { id: USER2_ID }, error: null })
        .mockResolvedValueOnce({ data: { first_name: 'Bob' }, error: null })
      addScheduleMock(tables)

      tables.server.registrations.then = vi.fn((onFulfilled: any) =>
        Promise.resolve({ data: [], error: null }).then(onFulfilled)
      )
      tables.service.registrations.then = vi.fn((onFulfilled: any) =>
        Promise.resolve({
          data: [{ id: 'reg-1', player_id: USER1_ID }, { id: 'reg-2', player_id: USER2_ID }],
          error: null,
        }).then(onFulfilled)
      )
      tables.service.teams.single.mockResolvedValueOnce({ data: { id: TEAM_ID }, error: null })
      tables.service.team_members.then = vi.fn((onFulfilled: any) =>
        Promise.resolve({ data: null, error: null }).then(onFulfilled)
      )

      const request = makeRequest({ ...validGroupBody, registration_mode: 'team' as const })
      const response = await POST(request as any)

      expect(response.status).toBe(200)
      expect(tables.service.teams.insert).toHaveBeenCalled()
      expect(tables.service.team_members.insert).toHaveBeenCalled()
    })

    it('returns 500 when team insert fails for group mode', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const { serverClient, serviceClient, tables } = buildMockClients()
      vi.mocked(createClient).mockResolvedValue(serverClient as any)
      vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)
      serverClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_ID } }, error: null })
      tables.server.users.single
        .mockResolvedValueOnce({ data: { role: 'admin' }, error: null })
        .mockResolvedValueOnce({ data: { id: USER1_ID }, error: null })
        .mockResolvedValueOnce({ data: { id: USER2_ID }, error: null })
        .mockResolvedValueOnce({ data: { first_name: 'Alice' }, error: null })
      addScheduleMock(tables)

      tables.server.registrations.then = vi.fn((onFulfilled: any) =>
        Promise.resolve({ data: [], error: null }).then(onFulfilled)
      )
      tables.service.registrations.then = vi.fn((onFulfilled: any) =>
        Promise.resolve({
          data: [{ id: 'reg-1', player_id: USER1_ID }, { id: 'reg-2', player_id: USER2_ID }],
          error: null,
        }).then(onFulfilled)
      )
      // Team insert fails
      tables.service.teams.single.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } })

      const request = makeRequest(validGroupBody)
      const response = await POST(request as any)

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toContain('Team creation failed')
    })

    it('returns 500 when team_members insert fails', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const { serverClient, serviceClient, tables } = buildMockClients()
      vi.mocked(createClient).mockResolvedValue(serverClient as any)
      vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)
      serverClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_ID } }, error: null })
      tables.server.users.single
        .mockResolvedValueOnce({ data: { role: 'admin' }, error: null })
        .mockResolvedValueOnce({ data: { id: USER1_ID }, error: null })
        .mockResolvedValueOnce({ data: { id: USER2_ID }, error: null })
        .mockResolvedValueOnce({ data: { first_name: 'Alice' }, error: null })
      addScheduleMock(tables)

      tables.server.registrations.then = vi.fn((onFulfilled: any) =>
        Promise.resolve({ data: [], error: null }).then(onFulfilled)
      )
      tables.service.registrations.then = vi.fn((onFulfilled: any) =>
        Promise.resolve({
          data: [{ id: 'reg-1', player_id: USER1_ID }, { id: 'reg-2', player_id: USER2_ID }],
          error: null,
        }).then(onFulfilled)
      )
      tables.service.teams.single.mockResolvedValueOnce({ data: { id: TEAM_ID }, error: null })
      // Team members fails
      tables.service.team_members.then = vi.fn((onFulfilled: any) =>
        Promise.resolve({ data: null, error: { message: 'members error' } }).then(onFulfilled)
      )

      const request = makeRequest(validGroupBody)
      const response = await POST(request as any)

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toContain('Team member assignment failed')
    })
  })

  // ── Request body fields forwarded correctly ───────────────────────────────────

  describe('Request Body Field Forwarding', () => {
    it('passes payment_status from request body into registration_payments insert', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const { serverClient, serviceClient, tables } = buildMockClients()
      vi.mocked(createClient).mockResolvedValue(serverClient as any)
      vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)
      setupSinglePlayerHappyPath(serverClient, tables)

      // Add registration_payments table mock
      tables.service.registration_payments = createQueryBuilder()

      const request = makeRequest({ ...validSingleBody, payment_status: 'review' as const })
      await POST(request as any)

      expect(tables.service.registration_payments.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_status: 'review',
        })
      )
    })

    it('passes team_preference from request body into registration insert', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const { serverClient, serviceClient, tables } = buildMockClients()
      vi.mocked(createClient).mockResolvedValue(serverClient as any)
      vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)
      setupSinglePlayerHappyPath(serverClient, tables)

      const request = makeRequest({ ...validSingleBody, team_preference: 'teammate' as const })
      await POST(request as any)

      expect(tables.service.registrations.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ team_preference: 'teammate' }),
        ])
      )
    })

    it('does not include payment_proof_url in registration insert (admin sets status, not proof)', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const { serverClient, serviceClient, tables } = buildMockClients()
      vi.mocked(createClient).mockResolvedValue(serverClient as any)
      vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)
      setupSinglePlayerHappyPath(serverClient, tables)

      const request = makeRequest(validSingleBody)
      await POST(request as any)

      expect(tables.service.registrations.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.not.objectContaining({ payment_proof_url: expect.anything() }),
        ])
      )
    })
  })

  // ── Happy path ────────────────────────────────────────────────────────────────

  describe('Happy Path', () => {
    it('returns 200 with success result for single player registration', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const { serverClient, serviceClient, tables } = buildMockClients()
      vi.mocked(createClient).mockResolvedValue(serverClient as any)
      vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)
      setupSinglePlayerHappyPath(serverClient, tables)

      const request = makeRequest(validSingleBody)
      const response = await POST(request as any)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.results).toHaveLength(1)
      expect(body.results[0].success).toBe(true)
      expect(body.results[0].user_id).toBe(USER1_ID)
    })

    it('returns 200 with success results for 2-player group registration', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const { serverClient, serviceClient, tables } = buildMockClients()
      vi.mocked(createClient).mockResolvedValue(serverClient as any)
      vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)
      setupGroupHappyPath(serverClient, tables)

      const request = makeRequest(validGroupBody)
      const response = await POST(request as any)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.results).toHaveLength(2)
      expect(body.results.every((r: any) => r.success === true)).toBe(true)
    })
  })
})
