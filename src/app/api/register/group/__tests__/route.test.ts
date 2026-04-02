import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from '../route'
import { createMockRequest } from '@/__tests__/helpers/next-mock'
import { createMockServiceClient, createMockServerClient, createQueryBuilder } from '@/__tests__/helpers/supabase-mock'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'

vi.mock('@/lib/services/guest-user')
vi.mock('@/lib/config/extraction-settings', () => ({
  getExtractionSetting: vi.fn().mockReturnValue({ enabled: true }),
}))

// ─── RFC 4122 valid UUIDs ──────────────────────────────────────────────────────
const SCH_ID     = 'a0a0a0a0-a0a0-4a0a-8a0a-a0a0a0a0a000'
const USER1_ID   = 'a0a0a0a1-a0a0-4a0a-8a0a-a0a0a0a0a001'
const USER2_ID   = 'a0a0a0a2-a0a0-4a0a-8a0a-a0a0a0a0a002'
const USER3_ID   = 'a0a0a0a3-a0a0-4a0a-8a0a-a0a0a0a0a003'
const USER4_ID   = 'a0a0a0a4-a0a0-4a0a-8a0a-a0a0a0a0a004'
const USER5_ID   = 'a0a0a0a5-a0a0-4a0a-8a0a-a0a0a0a0a005'
const USER6_ID   = 'a0a0a0a6-a0a0-4a0a-8a0a-a0a0a0a0a006'
const AUTH_ID    = 'a0a0a0a9-a0a0-4a0a-8a0a-a0a0a0a0a009'
const PAYMENT_ID = 'b0b0b0b0-b0b0-4b0b-8b0b-b0b0b0b0b000'
const TEAM_ID    = 'c0c0c0c0-c0c0-4c0c-8c0c-c0c0c0c0c000'

const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

const validGroupBody = {
  registration_mode: 'group' as const,
  schedule_id: SCH_ID,
  payment_proof_path: 'uploads/proof.jpg',
  players: [
    { type: 'existing' as const, user_id: USER1_ID, preferred_position: 'open_spiker' as const },
    { type: 'existing' as const, user_id: USER2_ID, preferred_position: 'setter' as const },
  ],
}

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

function makeRequest(body: object) {
  return createMockRequest('http://localhost/api/register/group', { method: 'POST', body })
}

/** Sets up a fresh pair of server/service mocks for each test */
function setupMocks() {
  const serverUsersBuilder = createQueryBuilder()
  const serverRegsBuilder  = createQueryBuilder()

  const mockServerClient = createMockServerClient()
  mockServerClient.from.mockImplementation((table: string) => {
    if (table === 'users')         return serverUsersBuilder
    if (table === 'registrations') return serverRegsBuilder
    return createQueryBuilder()
  })
  vi.mocked(createClient).mockResolvedValue(mockServerClient as any)

  const serviceSchedulesBuilder = createQueryBuilder()
  const serviceRegsBuilder      = createQueryBuilder()

  const mockServiceClient = createMockServiceClient()
  mockServiceClient.from.mockImplementation((table: string) => {
    if (table === 'schedules')     return serviceSchedulesBuilder
    if (table === 'registrations') return serviceRegsBuilder
    return createQueryBuilder()
  })
  vi.mocked(createServiceClient).mockReturnValue(mockServiceClient as any)

  return {
    mockServerClient,
    mockServiceClient,
    builders: {
      serverUsers: serverUsersBuilder,
      serverRegs: serverRegsBuilder,
      serviceSchedules: serviceSchedulesBuilder,
      serviceRegs: serviceRegsBuilder,
    },
  }
}

/**
 * Configures the pre-RPC state for a valid 2-player group scenario.
 * Does NOT set up the rpc mock — the caller is responsible for that.
 */
function configurePreRpc2Players(
  mockServerClient: ReturnType<typeof createMockServerClient>,
  builders: ReturnType<typeof setupMocks>['builders'],
) {
  mockServerClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_ID } }, error: null })

  // getUserById: USER1, USER2; getUserFirstName: AUTH_ID → 'Alice'
  builders.serverUsers.single
    .mockResolvedValueOnce({ data: { id: USER1_ID }, error: null })
    .mockResolvedValueOnce({ data: { id: USER2_ID }, error: null })
    .mockResolvedValueOnce({ data: { first_name: 'Alice' }, error: null })

  builders.serviceSchedules.single.mockResolvedValueOnce({
    data: { start_time: futureDate, status: 'scheduled', max_players: 100, position_prices: {}, team_price: 1000 },
    error: null,
  })

  // getRegistrationCountForSchedule → count = 0
  builders.serviceRegs.then = vi.fn((onFulfilled: any) =>
    Promise.resolve({ count: 0, data: null, error: null }).then(onFulfilled)
  )

  // checkDuplicateRegistrations → no duplicates
  builders.serverRegs.then = vi.fn((onFulfilled: any) =>
    Promise.resolve({ data: [], error: null }).then(onFulfilled)
  )
}

/** Configures a valid 2-player group scenario (happy path) including RPC success */
function configureHappyPath2Players(
  mockServerClient: ReturnType<typeof createMockServerClient>,
  mockServiceClient: ReturnType<typeof createMockServiceClient>,
  builders: ReturnType<typeof setupMocks>['builders'],
) {
  configurePreRpc2Players(mockServerClient, builders)

  // RPC → success
  mockServiceClient.rpc.mockResolvedValueOnce({
    data: { registration_ids: [USER1_ID, USER2_ID], team_id: TEAM_ID, payment_id: PAYMENT_ID },
    error: null,
  })
}

describe('POST /api/register/group', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Validation (schema only, no DB) ───────────────────────────────────────
  describe('Validation', () => {
    it('should return 400 when request schema is invalid', async () => {
      const response = await POST(makeRequest({ registration_mode: 'invalid', schedule_id: 'bad', players: [] }) as any)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Invalid request body')
    })

    it('should return 400 when schedule_id is not a valid UUID', async () => {
      const response = await POST(makeRequest({ ...validGroupBody, schedule_id: 'not-a-uuid' }) as any)
      expect(response.status).toBe(400)
    })

    it('should return 400 when players array has 1 item (schema min is 2)', async () => {
      const response = await POST(makeRequest({
        registration_mode: 'group',
        schedule_id: SCH_ID,
        payment_proof_path: 'uploads/proof.jpg',
        players: [{ type: 'existing', user_id: USER1_ID, preferred_position: 'open_spiker' }],
      }) as any)
      expect(response.status).toBe(400)
    })
  })

  // ── Authentication ────────────────────────────────────────────────────────
  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      const { mockServerClient } = setupMocks()
      mockServerClient.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
      const response = await POST(makeRequest(validGroupBody) as any)
      expect(response.status).toBe(401)
    })
  })

  // ── Schedule validation ───────────────────────────────────────────────────
  describe('Schedule validation', () => {
    it('should return 404 when schedule does not exist', async () => {
      const { mockServerClient, builders } = setupMocks()
      mockServerClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_ID } }, error: null })
      builders.serviceSchedules.single.mockResolvedValueOnce({ data: null, error: { message: 'not found' } })
      const response = await POST(makeRequest(validGroupBody) as any)
      expect(response.status).toBe(404)
    })

    it('should return 400 when schedule is in the past', async () => {
      const { mockServerClient, builders } = setupMocks()
      mockServerClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_ID } }, error: null })
      builders.serviceSchedules.single.mockResolvedValueOnce({
        data: { start_time: new Date(Date.now() - 1000).toISOString(), status: 'scheduled', max_players: 100, position_prices: {}, team_price: 1000 },
        error: null,
      })
      const response = await POST(makeRequest(validGroupBody) as any)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toContain('closed')
    })

    it('should return 400 when schedule status is cancelled', async () => {
      const { mockServerClient, builders } = setupMocks()
      mockServerClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_ID } }, error: null })
      builders.serviceSchedules.single.mockResolvedValueOnce({
        data: { start_time: futureDate, status: 'cancelled', max_players: 100, position_prices: {}, team_price: 1000 },
        error: null,
      })
      const response = await POST(makeRequest(validGroupBody) as any)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toContain('no longer accepting')
    })

    it('should return 400 when schedule is full', async () => {
      const { mockServerClient, builders } = setupMocks()
      mockServerClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_ID } }, error: null })
      builders.serviceSchedules.single.mockResolvedValueOnce({
        data: { start_time: futureDate, status: 'scheduled', max_players: 2, position_prices: {}, team_price: 1000 },
        error: null,
      })
      builders.serviceRegs.then = vi.fn((onFulfilled: any) =>
        Promise.resolve({ count: 2, data: null, error: null }).then(onFulfilled)
      )
      const response = await POST(makeRequest(validGroupBody) as any)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toContain('Not enough slots')
    })
  })

  // ── Player resolution ─────────────────────────────────────────────────────
  describe('Player resolution', () => {
    it('should return 400 when a player lookup fails', async () => {
      const { mockServerClient, builders } = setupMocks()
      mockServerClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_ID } }, error: null })
      builders.serviceSchedules.single.mockResolvedValueOnce({
        data: { start_time: futureDate, status: 'scheduled', max_players: 100, position_prices: {}, team_price: 1000 },
        error: null,
      })
      builders.serviceRegs.then = vi.fn((onFulfilled: any) =>
        Promise.resolve({ count: 0, data: null, error: null }).then(onFulfilled)
      )
      // First user lookup fails
      builders.serverUsers.single.mockResolvedValueOnce({ data: null, error: { message: 'User not found' } })

      const response = await POST(makeRequest(validGroupBody) as any)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.results.some((r: any) => r.error !== null)).toBe(true)
    })
  })

  // ── Position validation ───────────────────────────────────────────────────
  describe('Position validation', () => {
    it('should return 400 when group has >= 6 players', async () => {
      const { mockServerClient, builders } = setupMocks()
      mockServerClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_ID } }, error: null })
      builders.serviceSchedules.single.mockResolvedValueOnce({
        data: { start_time: futureDate, status: 'scheduled', max_players: 100, position_prices: {}, team_price: 1000 },
        error: null,
      })
      const response = await POST(makeRequest({
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
      }) as any)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toContain('Group registration requires 2–5 players')
    })

    it('should return 400 when group has 2 setters', async () => {
      const { mockServerClient, builders } = setupMocks()
      mockServerClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_ID } }, error: null })
      builders.serviceSchedules.single.mockResolvedValueOnce({
        data: { start_time: futureDate, status: 'scheduled', max_players: 100, position_prices: {}, team_price: 1000 },
        error: null,
      })
      const response = await POST(makeRequest({
        registration_mode: 'group',
        schedule_id: SCH_ID,
        payment_proof_path: 'uploads/proof.jpg',
        players: [
          { type: 'existing', user_id: USER1_ID, preferred_position: 'setter' },
          { type: 'existing', user_id: USER2_ID, preferred_position: 'setter' },
        ],
      }) as any)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toContain('Group does not meet position requirements')
    })
  })

  // ── Happy path ────────────────────────────────────────────────────────────
  describe('Happy path', () => {
    it('should return 200 and call rpc when group registration is valid', async () => {
      const { mockServerClient, mockServiceClient, builders } = setupMocks()
      configureHappyPath2Players(mockServerClient, mockServiceClient, builders)

      const response = await POST(makeRequest(validGroupBody) as any)

      expect(response.status).toBe(200)
      expect(mockServiceClient.rpc).toHaveBeenCalledWith(
        'register_group_transaction',
        expect.objectContaining({
          p_schedule_id: SCH_ID,
          p_registrations: expect.any(Array),
          p_team: expect.objectContaining({ name: expect.stringContaining('Group') }),
          p_team_members: expect.any(Array),
          p_payment: expect.objectContaining({
            payer_id: AUTH_ID,
            payment_status: 'pending',
            registration_type: 'group',
            extraction_status: 'pending',
          }),
        })
      )
      const body = await response.json()
      expect(body.results).toHaveLength(2)
      expect(body.results[0].success).toBe(true)
    })

    it('should pass extraction_status null when extraction is disabled', async () => {
      const { getExtractionSetting } = await import('@/lib/config/extraction-settings')
      vi.mocked(getExtractionSetting).mockReturnValueOnce({ enabled: false })

      const { mockServerClient, mockServiceClient, builders } = setupMocks()
      configureHappyPath2Players(mockServerClient, mockServiceClient, builders)

      const response = await POST(makeRequest(validGroupBody) as any)

      expect(response.status).toBe(200)
      expect(mockServiceClient.rpc).toHaveBeenCalledWith(
        'register_group_transaction',
        expect.objectContaining({
          p_payment: expect.objectContaining({ extraction_status: null }),
        })
      )
    })

    it('should not fire extraction fetch when extraction is disabled', async () => {
      const { getExtractionSetting } = await import('@/lib/config/extraction-settings')
      vi.mocked(getExtractionSetting).mockReturnValueOnce({ enabled: false })
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response())

      const { mockServerClient, mockServiceClient, builders } = setupMocks()
      configureHappyPath2Players(mockServerClient, mockServiceClient, builders)

      await POST(makeRequest(validGroupBody) as any)

      const extractCalls = fetchSpy.mock.calls.filter(([url]) =>
        String(url).includes('/api/payment-proof/extract')
      )
      expect(extractCalls).toHaveLength(0)
      fetchSpy.mockRestore()
    })

    it('should return 200 for valid team registration', async () => {
      const { mockServerClient, mockServiceClient, builders } = setupMocks()

      mockServerClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_ID } }, error: null })
      builders.serverUsers.single
        .mockResolvedValueOnce({ data: { id: USER1_ID }, error: null })
        .mockResolvedValueOnce({ data: { id: USER2_ID }, error: null })
        .mockResolvedValueOnce({ data: { id: USER3_ID }, error: null })
        .mockResolvedValueOnce({ data: { id: USER4_ID }, error: null })
        .mockResolvedValueOnce({ data: { id: USER5_ID }, error: null })
        .mockResolvedValueOnce({ data: { id: USER6_ID }, error: null })
        .mockResolvedValueOnce({ data: { first_name: 'Bob' }, error: null })
      builders.serviceSchedules.single.mockResolvedValueOnce({
        data: { start_time: futureDate, status: 'scheduled', max_players: 100, position_prices: {}, team_price: 2000 },
        error: null,
      })
      builders.serviceRegs.then = vi.fn((onFulfilled: any) =>
        Promise.resolve({ count: 0, data: null, error: null }).then(onFulfilled)
      )
      builders.serverRegs.then = vi.fn((onFulfilled: any) =>
        Promise.resolve({ data: [], error: null }).then(onFulfilled)
      )
      mockServiceClient.rpc.mockResolvedValueOnce({
        data: { registration_ids: [USER1_ID, USER2_ID, USER3_ID, USER4_ID, USER5_ID, USER6_ID], team_id: TEAM_ID, payment_id: PAYMENT_ID },
        error: null,
      })

      const response = await POST(makeRequest(validTeamBody) as any)
      expect(response.status).toBe(200)
      expect(mockServiceClient.rpc).toHaveBeenCalledWith(
        'register_group_transaction',
        expect.objectContaining({ p_payment: expect.objectContaining({ registration_type: 'team' }) })
      )
    })
  })

  // ── RPC errors ────────────────────────────────────────────────────────────
  describe('Database errors', () => {
    it('should return 500 when RPC returns an error', async () => {
      const { mockServerClient, mockServiceClient, builders } = setupMocks()
      configurePreRpc2Players(mockServerClient, builders)
      mockServiceClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Transaction rolled back' },
      })

      const response = await POST(makeRequest(validGroupBody) as any)
      expect(response.status).toBe(500)
    })
  })

  // ── Duplicate registration ────────────────────────────────────────────────
  describe('Duplicate check', () => {
    it('should return 400 when a player is already registered', async () => {
      const { mockServerClient, builders } = setupMocks()
      mockServerClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_ID } }, error: null })
      builders.serverUsers.single
        .mockResolvedValueOnce({ data: { id: USER1_ID }, error: null })
        .mockResolvedValueOnce({ data: { id: USER2_ID }, error: null })
      builders.serviceSchedules.single.mockResolvedValueOnce({
        data: { start_time: futureDate, status: 'scheduled', max_players: 100, position_prices: {}, team_price: 1000 },
        error: null,
      })
      builders.serviceRegs.then = vi.fn((onFulfilled: any) =>
        Promise.resolve({ count: 0, data: null, error: null }).then(onFulfilled)
      )
      builders.serverRegs.then = vi.fn((onFulfilled: any) =>
        Promise.resolve({ data: [{ player_id: USER1_ID }], error: null }).then(onFulfilled)
      )

      const response = await POST(makeRequest(validGroupBody) as any)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.results.some((r: any) => r.error === 'Already registered for this schedule')).toBe(true)
    })
  })
})
