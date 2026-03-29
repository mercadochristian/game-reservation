import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from '../route'
import { createMockRequest } from '@/__tests__/helpers/next-mock'

// Global setup (src/__tests__/setup.ts) auto-mocks these modules.
// Per-test configuration is done via vi.mocked(...).mockResolvedValue(...).
vi.mock('@/lib/services/guest-user')

// ─── RFC 4122 valid UUIDs ──────────────────────────────────────────────────────
// Zod v4 enforces strict RFC 4122 UUID format: version [1-8], variant [89abAB].
// Pattern: a0a0a0aX-a0a0-4a0a-8a0a-a0a0a0a0a0XX
const SCH_ID   = 'a0a0a0a0-a0a0-4a0a-8a0a-a0a0a0a0a000'
const USER1_ID = 'a0a0a0a1-a0a0-4a0a-8a0a-a0a0a0a0a001'
const USER2_ID = 'a0a0a0a2-a0a0-4a0a-8a0a-a0a0a0a0a002'
const USER3_ID = 'a0a0a0a3-a0a0-4a0a-8a0a-a0a0a0a0a003'
const USER4_ID = 'a0a0a0a4-a0a0-4a0a-8a0a-a0a0a0a0a004'
const USER5_ID = 'a0a0a0a5-a0a0-4a0a-8a0a-a0a0a0a0a005'
const USER6_ID = 'a0a0a0a6-a0a0-4a0a-8a0a-a0a0a0a0a006'
const AUTH_ID  = 'a0a0a0a9-a0a0-4a0a-8a0a-a0a0a0a0a009'
const TEAM_ID  = 'a0a0a0a8-a0a0-4a0a-8a0a-a0a0a0a0a008'

// ─── Valid request bodies ──────────────────────────────────────────────────────

const validGroupBody = {
  registration_mode: 'group' as const,
  schedule_id: SCH_ID,
  payment_proof_path: 'uploads/proof.jpg',
  players: [
    { type: 'existing' as const, user_id: USER1_ID, preferred_position: 'open_spiker' as const },
    { type: 'existing' as const, user_id: USER2_ID, preferred_position: 'setter' as const },
  ],
}

// Six players forming a valid team lineup
const validTeamBody = {
  registration_mode: 'team' as const,
  schedule_id: SCH_ID,
  payment_proof_path: 'uploads/proof.jpg',
  players: [
    { type: 'existing' as const, user_id: USER1_ID, preferred_position: 'setter' as const },
    { type: 'existing' as const, user_id: USER2_ID, preferred_position: 'middle_blocker' as const },
    { type: 'existing' as const, user_id: USER3_ID, preferred_position: 'middle_blocker' as const },
    { type: 'existing' as const, user_id: USER4_ID, preferred_position: 'open_spiker' as const },
    { type: 'existing' as const, user_id: USER5_ID, preferred_position: 'open_spiker' as const },
    { type: 'existing' as const, user_id: USER6_ID, preferred_position: 'opposite_spiker' as const },
  ],
}

// ─── Mock builder helpers ──────────────────────────────────────────────────────

/**
 * Creates an independent query builder per table so sequential .single() calls
 * on different tables are fully independent and not shared across table names.
 */
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
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  }
  builder.then = vi.fn((onFulfilled: any) =>
    Promise.resolve({ data: null, error: null }).then(onFulfilled)
  )
  builder.catch = vi.fn()
  builder.finally = vi.fn()
  return builder
}

function buildMockClients() {
  const serverTables: Record<string, any> = {
    users: createTableBuilder(),
    registrations: createTableBuilder(),
    teams: createTableBuilder(),
    team_members: createTableBuilder(),
  }
  const serviceTables: Record<string, any> = {
    users: createTableBuilder(),
    registrations: createTableBuilder(),
    teams: createTableBuilder(),
    team_members: createTableBuilder(),
  }

  const serverClient = {
    from: vi.fn((table: string) => serverTables[table] ?? createTableBuilder()),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  }

  const serviceClient = {
    from: vi.fn((table: string) => serviceTables[table] ?? createTableBuilder()),
    auth: {
      admin: {
        createUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  }

  return {
    serverClient,
    serviceClient,
    tables: { server: serverTables, service: serviceTables },
  }
}

function makeRequest(body: object) {
  return createMockRequest('http://localhost/api/register/group', {
    method: 'POST',
    body,
  })
}

// ─── Shared fixture ───────────────────────────────────────────────────────────

function setupHappyPath2Players(
  serverClient: any,
  serviceClient: any,
  tables: { server: Record<string, any>; service: Record<string, any> }
) {
  serverClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_ID } }, error: null })
  tables.server.users.single
    .mockResolvedValueOnce({ data: { id: USER1_ID }, error: null })
    .mockResolvedValueOnce({ data: { id: USER2_ID }, error: null })
    // Third call is registrant name for team naming
    .mockResolvedValueOnce({ data: { first_name: 'Alice' }, error: null })

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

describe('POST /api/register/group', () => {
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
      const request = makeRequest({
        ...validGroupBody,
        schedule_id: 'not-a-uuid',
      })

      const response = await POST(request as any)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Invalid request body')
    })

    it('rejects when players array has fewer than 2 items (Zod schema min)', async () => {
      // groupRegistrationSchema enforces min(2) — 1 player fails schema before route logic
      const request = makeRequest({
        registration_mode: 'group',
        schedule_id: SCH_ID,
        payment_proof_path: 'uploads/proof.jpg',
        players: [
          { type: 'existing', user_id: USER1_ID, preferred_position: 'open_spiker' },
        ],
      })

      const response = await POST(request as any)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Invalid request body')
    })

    it('rejects missing payment_proof_path', async () => {
      const { payment_proof_path: _omit, ...withoutProof } = validGroupBody
      const request = makeRequest(withoutProof)

      const response = await POST(request as any)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Invalid request body')
    })
  })

  // ── Group position validation ─────────────────────────────────────────────────

  describe('Position Validation - Group Mode', () => {
    it('rejects group with >=6 players (route-level check after Zod passes)', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const { serverClient, serviceClient } = buildMockClients()
      vi.mocked(createClient).mockResolvedValue(serverClient as any)
      vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)
      serverClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_ID } }, error: null })

      const request = makeRequest({
        registration_mode: 'group',
        schedule_id: SCH_ID,
        payment_proof_path: 'uploads/proof.jpg',
        players: [
          { type: 'existing', user_id: USER1_ID, preferred_position: 'open_spiker' },
          { type: 'existing', user_id: USER2_ID, preferred_position: 'setter' },
          { type: 'existing', user_id: USER3_ID, preferred_position: 'middle_blocker' },
          { type: 'existing', user_id: USER4_ID, preferred_position: 'middle_blocker' },
          { type: 'existing', user_id: USER5_ID, preferred_position: 'open_spiker' },
          { type: 'existing', user_id: USER6_ID, preferred_position: 'opposite_spiker' },
        ],
      })

      const response = await POST(request as any)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toContain('Group registration requires 2–5 players')
    })

    it('rejects group with 2 setters (position-limit violation)', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const { serverClient, serviceClient } = buildMockClients()
      vi.mocked(createClient).mockResolvedValue(serverClient as any)
      vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)
      serverClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_ID } }, error: null })

      const request = makeRequest({
        registration_mode: 'group',
        schedule_id: SCH_ID,
        payment_proof_path: 'uploads/proof.jpg',
        players: [
          { type: 'existing', user_id: USER1_ID, preferred_position: 'setter' },
          { type: 'existing', user_id: USER2_ID, preferred_position: 'setter' },
        ],
      })

      const response = await POST(request as any)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toContain('Group does not meet position requirements')
      expect(body.issues).toBeDefined()
    })

    it('rejects group with 2 opposite spikers', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const { serverClient, serviceClient } = buildMockClients()
      vi.mocked(createClient).mockResolvedValue(serverClient as any)
      vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)
      serverClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_ID } }, error: null })

      const request = makeRequest({
        registration_mode: 'group',
        schedule_id: SCH_ID,
        payment_proof_path: 'uploads/proof.jpg',
        players: [
          { type: 'existing', user_id: USER1_ID, preferred_position: 'opposite_spiker' },
          { type: 'existing', user_id: USER2_ID, preferred_position: 'opposite_spiker' },
        ],
      })

      const response = await POST(request as any)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toContain('Group does not meet position requirements')
    })

    it('accepts a valid 2-player group with distinct allowed positions', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const { serverClient, serviceClient, tables } = buildMockClients()
      vi.mocked(createClient).mockResolvedValue(serverClient as any)
      vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)
      setupHappyPath2Players(serverClient, serviceClient, tables)

      const request = makeRequest(validGroupBody)
      const response = await POST(request as any)
      expect(response.status).toBe(200)
    })
  })

  // ── Team position validation ──────────────────────────────────────────────────

  describe('Position Validation - Team Mode', () => {
    it('rejects team with fewer than 6 players', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const { serverClient, serviceClient } = buildMockClients()
      vi.mocked(createClient).mockResolvedValue(serverClient as any)
      vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)
      serverClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_ID } }, error: null })

      const request = makeRequest({
        registration_mode: 'team',
        schedule_id: SCH_ID,
        payment_proof_path: 'uploads/proof.jpg',
        players: [
          { type: 'existing', user_id: USER1_ID, preferred_position: 'setter' },
          { type: 'existing', user_id: USER2_ID, preferred_position: 'open_spiker' },
          { type: 'existing', user_id: USER3_ID, preferred_position: 'open_spiker' },
          { type: 'existing', user_id: USER4_ID, preferred_position: 'middle_blocker' },
          { type: 'existing', user_id: USER5_ID, preferred_position: 'middle_blocker' },
        ],
      })

      const response = await POST(request as any)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toContain('Team registration requires at least 6 players')
    })

    it('rejects team missing required position (no setter)', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const { serverClient, serviceClient } = buildMockClients()
      vi.mocked(createClient).mockResolvedValue(serverClient as any)
      vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)
      serverClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_ID } }, error: null })

      const request = makeRequest({
        registration_mode: 'team',
        schedule_id: SCH_ID,
        payment_proof_path: 'uploads/proof.jpg',
        players: [
          // 6 players, but no setter
          { type: 'existing', user_id: USER1_ID, preferred_position: 'open_spiker' },
          { type: 'existing', user_id: USER2_ID, preferred_position: 'open_spiker' },
          { type: 'existing', user_id: USER3_ID, preferred_position: 'middle_blocker' },
          { type: 'existing', user_id: USER4_ID, preferred_position: 'middle_blocker' },
          { type: 'existing', user_id: USER5_ID, preferred_position: 'opposite_spiker' },
          { type: 'existing', user_id: USER6_ID, preferred_position: 'open_spiker' },
        ],
      })

      const response = await POST(request as any)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toContain('Team does not meet minimum position requirements')
      expect(body.missing).toBeDefined()
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

      const request = makeRequest(validGroupBody)
      const response = await POST(request as any)

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
    })
  })

  // ── Player resolution ─────────────────────────────────────────────────────────

  describe('Player Resolution', () => {
    it('resolves two existing players and returns success results', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const { serverClient, serviceClient, tables } = buildMockClients()
      vi.mocked(createClient).mockResolvedValue(serverClient as any)
      vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)
      setupHappyPath2Players(serverClient, serviceClient, tables)

      const request = makeRequest(validGroupBody)
      const response = await POST(request as any)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.results).toHaveLength(2)
      expect(body.results[0].success).toBe(true)
      expect(body.results[0].user_id).toBe(USER1_ID)
      expect(body.results[1].success).toBe(true)
      expect(body.results[1].user_id).toBe(USER2_ID)
    })

    it('returns 400 with error result when an existing player user_id is not found', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const { serverClient, serviceClient, tables } = buildMockClients()
      vi.mocked(createClient).mockResolvedValue(serverClient as any)
      vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)
      serverClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_ID } }, error: null })

      // First player not found; second found
      tables.server.users.single
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: { id: USER2_ID }, error: null })

      const request = makeRequest(validGroupBody)
      const response = await POST(request as any)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.results[0].success).toBe(false)
      expect(body.results[0].error).toContain('User not found')
    })

    it('returns 400 when user lookup returns a DB error', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const { serverClient, serviceClient, tables } = buildMockClients()
      vi.mocked(createClient).mockResolvedValue(serverClient as any)
      vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)
      serverClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_ID } }, error: null })

      tables.server.users.single
        .mockResolvedValueOnce({ data: null, error: { message: 'DB timeout' } })
        .mockResolvedValueOnce({ data: { id: USER2_ID }, error: null })

      const request = makeRequest(validGroupBody)
      const response = await POST(request as any)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.results[0].success).toBe(false)
      expect(body.results[0].error).toContain('User not found')
    })

    it('resolves a guest player via createGuestUser service', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const { createGuestUser } = await import('@/lib/services/guest-user')
      const { serverClient, serviceClient, tables } = buildMockClients()
      vi.mocked(createClient).mockResolvedValue(serverClient as any)
      vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)
      serverClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_ID } }, error: null })

      // First player is existing
      tables.server.users.single
        .mockResolvedValueOnce({ data: { id: USER1_ID }, error: null })
        // Third call: registrant name
        .mockResolvedValueOnce({ data: { first_name: 'Alice' }, error: null })

      // Second player is guest
      vi.mocked(createGuestUser).mockResolvedValueOnce({ user_id: USER2_ID, error: null, reused: false })

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

      const bodyWithGuest = {
        registration_mode: 'group' as const,
        schedule_id: SCH_ID,
        payment_proof_path: 'uploads/proof.jpg',
        players: [
          { type: 'existing' as const, user_id: USER1_ID, preferred_position: 'open_spiker' as const },
          { type: 'guest' as const, first_name: 'Jane', last_name: 'Guest', email: 'jane@example.com', preferred_position: 'setter' as const },
        ],
      }

      const request = makeRequest(bodyWithGuest)
      const response = await POST(request as any)

      expect(response.status).toBe(200)
      expect(vi.mocked(createGuestUser)).toHaveBeenCalledOnce()
      const body = await response.json()
      expect(body.results[1].success).toBe(true)
      expect(body.results[1].user_id).toBe(USER2_ID)
    })

    it('returns 400 when createGuestUser returns an error', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const { createGuestUser } = await import('@/lib/services/guest-user')
      const { serverClient, serviceClient, tables } = buildMockClients()
      vi.mocked(createClient).mockResolvedValue(serverClient as any)
      vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)
      serverClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_ID } }, error: null })

      tables.server.users.single.mockResolvedValueOnce({ data: { id: USER1_ID }, error: null })
      vi.mocked(createGuestUser).mockResolvedValueOnce({
        user_id: null,
        error: 'Failed to create account. Please try again.',
        reused: false,
      })

      const bodyWithGuest = {
        registration_mode: 'group' as const,
        schedule_id: SCH_ID,
        payment_proof_path: 'uploads/proof.jpg',
        players: [
          { type: 'existing' as const, user_id: USER1_ID, preferred_position: 'open_spiker' as const },
          { type: 'guest' as const, first_name: 'Bad', last_name: 'Guest', email: 'bad@example.com', preferred_position: 'setter' as const },
        ],
      }

      const request = makeRequest(bodyWithGuest)
      const response = await POST(request as any)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.results[1].success).toBe(false)
      expect(body.results[1].error).toContain('Failed to create account')
    })
  })

  // ── Duplicate detection ───────────────────────────────────────────────────────

  describe('Duplicate Detection', () => {
    it('returns 400 with per-player error when one player is already registered', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const { serverClient, serviceClient, tables } = buildMockClients()
      vi.mocked(createClient).mockResolvedValue(serverClient as any)
      vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)
      serverClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_ID } }, error: null })

      tables.server.users.single
        .mockResolvedValueOnce({ data: { id: USER1_ID }, error: null })
        .mockResolvedValueOnce({ data: { id: USER2_ID }, error: null })

      // USER1 is already registered
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

    it('returns 400 when all players are already registered', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const { serverClient, serviceClient, tables } = buildMockClients()
      vi.mocked(createClient).mockResolvedValue(serverClient as any)
      vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)
      serverClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_ID } }, error: null })

      tables.server.users.single
        .mockResolvedValueOnce({ data: { id: USER1_ID }, error: null })
        .mockResolvedValueOnce({ data: { id: USER2_ID }, error: null })

      tables.server.registrations.then = vi.fn((onFulfilled: any) =>
        Promise.resolve({
          data: [{ player_id: USER1_ID }, { player_id: USER2_ID }],
          error: null,
        }).then(onFulfilled)
      )

      const request = makeRequest(validGroupBody)
      const response = await POST(request as any)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.results[0].success).toBe(false)
      expect(body.results[1].success).toBe(false)
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
        .mockResolvedValueOnce({ data: { id: USER1_ID }, error: null })
        .mockResolvedValueOnce({ data: { id: USER2_ID }, error: null })

      tables.server.registrations.then = vi.fn((onFulfilled: any) =>
        Promise.resolve({ data: [], error: null }).then(onFulfilled)
      )
      // Batch insert fails
      tables.service.registrations.then = vi.fn((onFulfilled: any) =>
        Promise.resolve({ data: null, error: { message: 'DB constraint violation' } }).then(onFulfilled)
      )

      const request = makeRequest(validGroupBody)
      const response = await POST(request as any)

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toContain('Registration failed')
    })
  })

  // ── Team creation errors ──────────────────────────────────────────────────────

  describe('Team Creation Errors', () => {
    it('returns 500 when team insert fails', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const { serverClient, serviceClient, tables } = buildMockClients()
      vi.mocked(createClient).mockResolvedValue(serverClient as any)
      vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)
      serverClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_ID } }, error: null })

      tables.server.users.single
        .mockResolvedValueOnce({ data: { id: USER1_ID }, error: null })
        .mockResolvedValueOnce({ data: { id: USER2_ID }, error: null })
        .mockResolvedValueOnce({ data: { first_name: 'Alice' }, error: null })

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
      tables.service.teams.single.mockResolvedValueOnce({ data: null, error: { message: 'Team insert error' } })

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
        .mockResolvedValueOnce({ data: { id: USER1_ID }, error: null })
        .mockResolvedValueOnce({ data: { id: USER2_ID }, error: null })
        .mockResolvedValueOnce({ data: { first_name: 'Alice' }, error: null })

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
      // Team members insert fails
      tables.service.team_members.then = vi.fn((onFulfilled: any) =>
        Promise.resolve({ data: null, error: { message: 'members insert error' } }).then(onFulfilled)
      )

      const request = makeRequest(validGroupBody)
      const response = await POST(request as any)

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toContain('Team member assignment failed')
    })
  })

  // ── Happy path ────────────────────────────────────────────────────────────────

  describe('Happy Path', () => {
    it('registers a valid 2-player group and returns 200 with all results', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const { serverClient, serviceClient, tables } = buildMockClients()
      vi.mocked(createClient).mockResolvedValue(serverClient as any)
      vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)
      setupHappyPath2Players(serverClient, serviceClient, tables)

      const request = makeRequest(validGroupBody)
      const response = await POST(request as any)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.results).toHaveLength(2)
      expect(body.results.every((r: any) => r.success === true)).toBe(true)
    })

    it('registers a valid 6-player team and returns 200', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const { serverClient, serviceClient, tables } = buildMockClients()
      vi.mocked(createClient).mockResolvedValue(serverClient as any)
      vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)
      serverClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_ID } }, error: null })

      const teamPlayerIds = [USER1_ID, USER2_ID, USER3_ID, USER4_ID, USER5_ID, USER6_ID]
      tables.server.users.single
        .mockResolvedValueOnce({ data: { id: USER1_ID }, error: null })
        .mockResolvedValueOnce({ data: { id: USER2_ID }, error: null })
        .mockResolvedValueOnce({ data: { id: USER3_ID }, error: null })
        .mockResolvedValueOnce({ data: { id: USER4_ID }, error: null })
        .mockResolvedValueOnce({ data: { id: USER5_ID }, error: null })
        .mockResolvedValueOnce({ data: { id: USER6_ID }, error: null })
        // Registrant name
        .mockResolvedValueOnce({ data: { first_name: 'Bob' }, error: null })

      tables.server.registrations.then = vi.fn((onFulfilled: any) =>
        Promise.resolve({ data: [], error: null }).then(onFulfilled)
      )
      tables.service.registrations.then = vi.fn((onFulfilled: any) =>
        Promise.resolve({
          data: teamPlayerIds.map((id, i) => ({ id: `reg-${i}`, player_id: id })),
          error: null,
        }).then(onFulfilled)
      )
      tables.service.teams.single.mockResolvedValueOnce({ data: { id: TEAM_ID }, error: null })
      tables.service.team_members.then = vi.fn((onFulfilled: any) =>
        Promise.resolve({ data: null, error: null }).then(onFulfilled)
      )

      const request = makeRequest(validTeamBody)
      const response = await POST(request as any)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.results).toHaveLength(6)
      expect(body.results.every((r: any) => r.success === true)).toBe(true)
    })

    it('uses registrant first_name in the team name', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const { serverClient, serviceClient, tables } = buildMockClients()
      vi.mocked(createClient).mockResolvedValue(serverClient as any)
      vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)
      setupHappyPath2Players(serverClient, serviceClient, tables)

      const request = makeRequest(validGroupBody)
      await POST(request as any)

      expect(tables.service.teams.insert).toHaveBeenCalledWith(
        expect.objectContaining({ name: expect.stringContaining('Alice') })
      )
    })

    it('falls back to "Group" in team name when registrant has no first_name', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const { createServiceClient } = await import('@/lib/supabase/service')
      const { serverClient, serviceClient, tables } = buildMockClients()
      vi.mocked(createClient).mockResolvedValue(serverClient as any)
      vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)
      serverClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_ID } }, error: null })

      tables.server.users.single
        .mockResolvedValueOnce({ data: { id: USER1_ID }, error: null })
        .mockResolvedValueOnce({ data: { id: USER2_ID }, error: null })
        .mockResolvedValueOnce({ data: { first_name: null }, error: null })

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

      const request = makeRequest(validGroupBody)
      const response = await POST(request as any)

      expect(response.status).toBe(200)
      expect(tables.service.teams.insert).toHaveBeenCalledWith(
        expect.objectContaining({ name: expect.stringContaining('Group') })
      )
    })
  })
})
