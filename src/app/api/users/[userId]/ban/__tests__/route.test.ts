import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockServiceClient, createMockServerClient } from '@/__tests__/helpers/supabase-mock'
import { createMockRequest } from '@/__tests__/helpers/next-mock'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'

const AUTH_USER_ID = '11111111-1111-1111-1111-111111111111'
const TARGET_USER_ID = '22222222-2222-2222-2222-222222222222'

function makeRequest(userId: string) {
  return createMockRequest(`/api/users/${userId}/ban`, { method: 'PATCH' })
}

describe('PATCH /api/users/[userId]/ban', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not authenticated', async () => {
    const { PATCH } = await import('../route')
    const serverClient = createMockServerClient()
    serverClient.auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'not auth' } })
    vi.mocked(createClient).mockResolvedValue(serverClient as any)

    const res = await PATCH(makeRequest(TARGET_USER_ID), { params: Promise.resolve({ userId: TARGET_USER_ID }) })
    expect(res.status).toBe(401)
  })

  it('should return 403 when caller is not admin or super_admin', async () => {
    const { PATCH } = await import('../route')
    const serverClient = createMockServerClient()
    serverClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_USER_ID } }, error: null })
    vi.mocked(createClient).mockResolvedValue(serverClient as any)

    const serviceClient = createMockServiceClient()
    const qb = serviceClient.from('users')
    qb.single.mockResolvedValue({ data: { id: AUTH_USER_ID, role: 'player' }, error: null })
    vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)

    const res = await PATCH(makeRequest(TARGET_USER_ID), { params: Promise.resolve({ userId: TARGET_USER_ID }) })
    expect(res.status).toBe(403)
  })

  it('should return 400 when trying to ban yourself', async () => {
    const { PATCH } = await import('../route')
    const serverClient = createMockServerClient()
    serverClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_USER_ID } }, error: null })
    vi.mocked(createClient).mockResolvedValue(serverClient as any)

    const serviceClient = createMockServiceClient()
    const qb = serviceClient.from('users')
    qb.single.mockResolvedValue({ data: { id: AUTH_USER_ID, role: 'admin' }, error: null })
    vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)

    const res = await PATCH(makeRequest(AUTH_USER_ID), { params: Promise.resolve({ userId: AUTH_USER_ID }) })
    expect(res.status).toBe(400)
  })

  it('should return 404 when target user does not exist', async () => {
    const { PATCH } = await import('../route')
    const serverClient = createMockServerClient()
    serverClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_USER_ID } }, error: null })
    vi.mocked(createClient).mockResolvedValue(serverClient as any)

    const serviceClient = createMockServiceClient()
    let callCount = 0
    serviceClient.from.mockImplementation(() => {
      callCount++
      const qb = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(), single: vi.fn() }
      qb.single.mockResolvedValue(
        callCount === 1
          ? { data: { id: AUTH_USER_ID, role: 'admin' }, error: null }
          : { data: null, error: { message: 'not found' } }
      )
      return qb
    })
    vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)

    const res = await PATCH(makeRequest(TARGET_USER_ID), { params: Promise.resolve({ userId: TARGET_USER_ID }) })
    expect(res.status).toBe(404)
  })

  it('should return 200 and set banned_at when admin bans a player', async () => {
    const { PATCH } = await import('../route')
    const serverClient = createMockServerClient()
    serverClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_USER_ID } }, error: null })
    vi.mocked(createClient).mockResolvedValue(serverClient as any)

    const serviceClient = createMockServiceClient()
    let callCount = 0
    serviceClient.from.mockImplementation((table: string) => {
      if (table === 'logs') {
        return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) }
      }
      callCount++
      const qb = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(), single: vi.fn() }
      if (callCount === 1) {
        qb.single.mockResolvedValue({ data: { id: AUTH_USER_ID, role: 'admin' }, error: null })
      } else if (callCount === 2) {
        qb.single.mockResolvedValue({ data: { id: TARGET_USER_ID, role: 'player' }, error: null })
      } else {
        ;(qb as any).mockResolvedValue = vi.fn()
      }
      return qb
    })
    vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)

    const res = await PATCH(makeRequest(TARGET_USER_ID), { params: Promise.resolve({ userId: TARGET_USER_ID }) })
    expect(res.status).toBe(200)
  })

  it('should return 500 when DB update fails', async () => {
    const { PATCH } = await import('../route')
    const serverClient = createMockServerClient()
    serverClient.auth.getUser.mockResolvedValue({ data: { user: { id: AUTH_USER_ID } }, error: null })
    vi.mocked(createClient).mockResolvedValue(serverClient as any)

    const serviceClient = createMockServiceClient()
    let callCount = 0
    serviceClient.from.mockImplementation((table: string) => {
      if (table === 'logs') return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) }
      callCount++
      const qb = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(), single: vi.fn() }
      if (callCount === 1) {
        qb.single.mockResolvedValue({ data: { id: AUTH_USER_ID, role: 'admin' }, error: null })
      } else if (callCount === 2) {
        qb.single.mockResolvedValue({ data: { id: TARGET_USER_ID, role: 'player' }, error: null })
      } else {
        ;(qb.update as any).mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: { message: 'db error' } }) })
      }
      return qb
    })
    vi.mocked(createServiceClient).mockReturnValue(serviceClient as any)

    const res = await PATCH(makeRequest(TARGET_USER_ID), { params: Promise.resolve({ userId: TARGET_USER_ID }) })
    expect(res.status).toBe(500)
  })
})
