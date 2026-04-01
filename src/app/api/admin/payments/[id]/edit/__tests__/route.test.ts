import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PATCH } from '../route'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createMockRequest } from '@/__tests__/helpers/next-mock'
import { logActivity, logError } from '@/lib/logger'

vi.mock('@/lib/supabase/server')
vi.mock('@/lib/supabase/service')
vi.mock('@/lib/logger')

// ---------------------------------------------------------------------------
// Helper: build mock Supabase clients
// ---------------------------------------------------------------------------

function buildServerClientMock({
  authUser = { id: 'admin-1', email: 'admin@test.com' },
  authError = null,
  roleData = { role: 'admin' },
  roleError = null,
} = {}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: authUser }, error: authError }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: roleData, error: roleError }),
        }),
      }),
    }),
  }
}

function buildServiceClientMock({
  updateData = null,
  updateError = null,
} = {}) {
  return {
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: updateData, error: updateError }),
      }),
    }),
  }
}

describe('PATCH /api/admin/payments/[id]/edit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // Authentication & Authorization
  // -------------------------------------------------------------------------

  it('returns 401 when user is not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildServerClientMock({ authUser: null, authError: new Error('No session') }) as any
    )

    const req = createMockRequest('/api/admin/payments/payment-1/edit', {
      method: 'PATCH',
      body: { payment_note: 'Test note' },
    })

    const response = await PATCH(req, { params: { id: 'payment-1' } })
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toEqual({ error: 'Unauthorized' })
  })

  it('returns 403 when user is not an admin', async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildServerClientMock({ roleData: { role: 'player' } }) as any
    )

    const req = createMockRequest('/api/admin/payments/payment-1/edit', {
      method: 'PATCH',
      body: { payment_note: 'Test note' },
    })

    const response = await PATCH(req, { params: { id: 'payment-1' } })
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body).toEqual({ error: 'Forbidden' })
  })

  it('allows super_admin to edit payments', async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildServerClientMock({ roleData: { role: 'super_admin' } }) as any
    )
    vi.mocked(createServiceClient).mockReturnValue(
      buildServiceClientMock({ updateData: {}, updateError: null }) as any
    )

    const req = createMockRequest('/api/admin/payments/payment-1/edit', {
      method: 'PATCH',
      body: { extracted_amount: 100, payment_note: 'Test note' },
    })

    const response = await PATCH(req, { params: { id: 'payment-1' } })

    expect(response.status).toBe(200)
  })

  // -------------------------------------------------------------------------
  // Input Validation
  // -------------------------------------------------------------------------

  it('returns 400 for invalid JSON', async () => {
    vi.mocked(createClient).mockResolvedValue(buildServerClientMock() as any)

    // Create a request with invalid body - we need to bypass the helper
    const invalidReq = new Request('http://localhost/api/admin/payments/payment-1/edit', {
      method: 'PATCH',
      body: 'not valid json',
    })

    const response = await PATCH(invalidReq as any, { params: { id: 'payment-1' } })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toEqual({ error: 'Invalid JSON' })
  })

  it('returns 422 when extracted_amount is negative', async () => {
    vi.mocked(createClient).mockResolvedValue(buildServerClientMock() as any)

    const req = createMockRequest('/api/admin/payments/payment-1/edit', {
      method: 'PATCH',
      body: { extracted_amount: -100 },
    })

    const response = await PATCH(req, { params: { id: 'payment-1' } })
    const body = await response.json()

    expect(response.status).toBe(422)
    expect(body.error).toBeDefined()
  })

  it('returns 422 when extracted_amount is zero', async () => {
    vi.mocked(createClient).mockResolvedValue(buildServerClientMock() as any)

    const req = createMockRequest('/api/admin/payments/payment-1/edit', {
      method: 'PATCH',
      body: { extracted_amount: 0 },
    })

    const response = await PATCH(req, { params: { id: 'payment-1' } })
    const body = await response.json()

    expect(response.status).toBe(422)
    expect(body.error).toBeDefined()
  })

  it('returns 422 when payment_note exceeds 200 characters', async () => {
    vi.mocked(createClient).mockResolvedValue(buildServerClientMock() as any)

    const longNote = 'a'.repeat(201)
    const req = createMockRequest('/api/admin/payments/payment-1/edit', {
      method: 'PATCH',
      body: { payment_note: longNote },
    })

    const response = await PATCH(req, { params: { id: 'payment-1' } })
    const body = await response.json()

    expect(response.status).toBe(422)
    expect(body.error).toBeDefined()
  })

  // -------------------------------------------------------------------------
  // Happy Path
  // -------------------------------------------------------------------------

  it('successfully updates payment with all fields', async () => {
    vi.mocked(createClient).mockResolvedValue(buildServerClientMock() as any)
    vi.mocked(createServiceClient).mockReturnValue(
      buildServiceClientMock({ updateData: {}, updateError: null }) as any
    )

    const req = createMockRequest('/api/admin/payments/payment-1/edit', {
      method: 'PATCH',
      body: {
        extracted_amount: 500,
        extracted_reference: 'REF-123',
        extracted_datetime: '2026-04-01T12:00:00Z',
        extracted_sender: 'John Doe',
        payment_note: 'Payment verified',
      },
    })

    const response = await PATCH(req, { params: { id: 'payment-1' } })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ success: true })
  })

  it('successfully updates only payment_note field', async () => {
    vi.mocked(createClient).mockResolvedValue(buildServerClientMock() as any)
    vi.mocked(createServiceClient).mockReturnValue(
      buildServiceClientMock({ updateData: {}, updateError: null }) as any
    )

    const req = createMockRequest('/api/admin/payments/payment-1/edit', {
      method: 'PATCH',
      body: { payment_note: 'Admin note here' },
    })

    const response = await PATCH(req, { params: { id: 'payment-1' } })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ success: true })
  })

  it('trims payment_note before storing', async () => {
    const serviceClientMock = buildServiceClientMock({ updateData: {}, updateError: null })
    const updateEqFn = vi.fn().mockResolvedValue({ data: {}, error: null })
    const updateFn = vi.fn().mockReturnValue({ eq: updateEqFn })
    serviceClientMock.from = vi.fn().mockReturnValue({ update: updateFn })

    vi.mocked(createClient).mockResolvedValue(buildServerClientMock() as any)
    vi.mocked(createServiceClient).mockReturnValue(serviceClientMock as any)

    const req = createMockRequest('/api/admin/payments/payment-1/edit', {
      method: 'PATCH',
      body: { payment_note: '  Test note with spaces  ' },
    })

    const response = await PATCH(req, { params: { id: 'payment-1' } })

    expect(response.status).toBe(200)
    const updateCall = updateFn.mock.calls[0][0]
    expect(updateCall.payment_note).toBe('Test note with spaces')
  })

  it('converts empty payment_note to null', async () => {
    const serviceClientMock = buildServiceClientMock({ updateData: {}, updateError: null })
    const updateEqFn = vi.fn().mockResolvedValue({ data: {}, error: null })
    const updateFn = vi.fn().mockReturnValue({ eq: updateEqFn })
    serviceClientMock.from = vi.fn().mockReturnValue({ update: updateFn })

    vi.mocked(createClient).mockResolvedValue(buildServerClientMock() as any)
    vi.mocked(createServiceClient).mockReturnValue(serviceClientMock as any)

    const req = createMockRequest('/api/admin/payments/payment-1/edit', {
      method: 'PATCH',
      body: { payment_note: '   ' },
    })

    const response = await PATCH(req, { params: { id: 'payment-1' } })

    expect(response.status).toBe(200)
    const updateCall = updateFn.mock.calls[0][0]
    expect(updateCall.payment_note).toBeNull()
  })

  // -------------------------------------------------------------------------
  // Error Handling
  // -------------------------------------------------------------------------

  it('returns 500 when Supabase update fails', async () => {
    vi.mocked(createClient).mockResolvedValue(buildServerClientMock() as any)
    vi.mocked(createServiceClient).mockReturnValue(
      buildServiceClientMock({
        updateData: null,
        updateError: { message: 'DB constraint violation' }
      }) as any
    )

    const req = createMockRequest('/api/admin/payments/payment-1/edit', {
      method: 'PATCH',
      body: { extracted_amount: 500, payment_note: 'Test' },
    })

    const response = await PATCH(req, { params: { id: 'payment-1' } })
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toContain('Failed to update payment')
  })

  // -------------------------------------------------------------------------
  // Activity Logging
  // -------------------------------------------------------------------------

  it('logs activity on successful update', async () => {
    vi.mocked(createClient).mockResolvedValue(buildServerClientMock() as any)
    vi.mocked(createServiceClient).mockReturnValue(
      buildServiceClientMock({ updateData: {}, updateError: null }) as any
    )

    const req = createMockRequest('/api/admin/payments/payment-1/edit', {
      method: 'PATCH',
      body: {
        extracted_amount: 500,
        extracted_reference: 'REF-123',
        payment_note: 'Updated note',
      },
    })

    await PATCH(req, { params: { id: 'payment-1' } })

    expect(logActivity).toHaveBeenCalledWith(
      'payment.edit',
      'admin-1',
      expect.objectContaining({
        payment_id: 'payment-1',
        extracted_amount: 500,
        extracted_reference: 'REF-123',
        payment_note: 'Updated note',
      })
    )
  })

  it('logs error on update failure', async () => {
    vi.mocked(createClient).mockResolvedValue(buildServerClientMock() as any)
    vi.mocked(createServiceClient).mockReturnValue(
      buildServiceClientMock({
        updateData: null,
        updateError: { message: 'DB error' }
      }) as any
    )

    const req = createMockRequest('/api/admin/payments/payment-1/edit', {
      method: 'PATCH',
      body: { payment_note: 'Test' },
    })

    await PATCH(req, { params: { id: 'payment-1' } })

    expect(logError).toHaveBeenCalledWith(
      'payment.edit',
      { message: 'DB error' },
      'admin-1',
      expect.objectContaining({
        payment_id: 'payment-1',
      })
    )
  })
})
