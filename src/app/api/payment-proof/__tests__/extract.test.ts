// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../extract/route'
import { createMockRequest } from '@/__tests__/helpers/next-mock'
import { createMockServiceClient, createMockServerClient } from '@/__tests__/helpers/supabase-mock'

vi.mock('@/lib/config/extraction-settings', () => ({
  getExtractionSetting: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))

vi.mock('@/lib/queries/payments', () => ({
  updatePaymentExtraction: vi.fn().mockResolvedValue({ data: null, error: null }),
}))

import { getExtractionSetting } from '@/lib/config/extraction-settings'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { updatePaymentExtraction } from '@/lib/queries/payments'

const PAYMENT_ID = 'b0b0b0b0-b0b0-4b0b-8b0b-b0b0b0b0b000'
const AUTH_USER_ID = 'a0a0a0a9-a0a0-4a0a-8a0a-a0a0a0a0a009'

function makeRequest(body: object) {
  return createMockRequest('/api/payment-proof/extract', {
    method: 'POST',
    body,
  })
}

describe('POST /api/payment-proof/extract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 200 with skipped:true when extraction is disabled', async () => {
    vi.mocked(getExtractionSetting).mockReturnValue({ enabled: false })

    const request = createMockRequest('/api/payment-proof/extract', {
      method: 'POST',
      body: { user_payment_id: 'abc-123', payment_proof_url: 'some/path.jpg' },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ skipped: true, reason: 'extraction_disabled' })
    expect(createClient).not.toHaveBeenCalled()
  })

  describe('Download failure path', () => {
    it('should set extraction_status: failed when file download fails', async () => {
      vi.mocked(getExtractionSetting).mockReturnValue({ enabled: true })

      const mockServerClient = createMockServerClient()
      mockServerClient.auth.getUser.mockResolvedValue({
        data: { user: { id: AUTH_USER_ID } },
        error: null,
      })
      vi.mocked(createClient).mockResolvedValue(mockServerClient as any)

      const mockServiceClient = createMockServiceClient()
      mockServiceClient.storage.from.mockReturnValue({
        download: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      })
      vi.mocked(createServiceClient).mockReturnValue(mockServiceClient as any)

      const response = await POST(makeRequest({
        user_payment_id: PAYMENT_ID,
        payment_proof_url: 'uploads/proof.jpg',
      }))

      expect(response.status).toBe(200)
      expect(updatePaymentExtraction).toHaveBeenCalledWith(
        mockServiceClient,
        PAYMENT_ID,
        expect.objectContaining({ extraction_status: 'failed' })
      )
    })
  })

  describe('Mock extraction path', () => {
    it('should set extraction_status: done on successful mock extraction', async () => {
      process.env.MOCK_EXTRACTION = 'true'

      vi.mocked(getExtractionSetting).mockReturnValue({ enabled: true })

      const mockServerClient = createMockServerClient()
      mockServerClient.auth.getUser.mockResolvedValue({
        data: { user: { id: AUTH_USER_ID } },
        error: null,
      })
      vi.mocked(createClient).mockResolvedValue(mockServerClient as any)

      const mockArrayBuffer = new ArrayBuffer(8)
      const mockServiceClient = createMockServiceClient()
      mockServiceClient.storage.from.mockReturnValue({
        download: vi.fn().mockResolvedValue({
          data: { arrayBuffer: async () => mockArrayBuffer },
          error: null,
        }),
      })
      vi.mocked(createServiceClient).mockReturnValue(mockServiceClient as any)

      const response = await POST(makeRequest({
        user_payment_id: PAYMENT_ID,
        payment_proof_url: 'uploads/proof.jpg',
      }))

      expect(response.status).toBe(200)
      expect(updatePaymentExtraction).toHaveBeenCalledWith(
        mockServiceClient,
        PAYMENT_ID,
        expect.objectContaining({ extraction_status: 'done' })
      )

      delete process.env.MOCK_EXTRACTION
    })
  })

  describe('Outer catch', () => {
    it('should set extraction_status: failed when paymentId is set and an error is thrown', async () => {
      vi.mocked(getExtractionSetting).mockReturnValue({ enabled: true })

      const mockServerClient = createMockServerClient()
      mockServerClient.auth.getUser.mockResolvedValue({
        data: { user: { id: AUTH_USER_ID } },
        error: null,
      })
      vi.mocked(createClient).mockResolvedValue(mockServerClient as any)

      // Make download throw to trigger outer catch after paymentId is set
      const mockServiceClient = createMockServiceClient()
      mockServiceClient.storage.from.mockReturnValue({
        download: vi.fn().mockRejectedValue(new Error('Unexpected storage failure')),
      })
      vi.mocked(createServiceClient).mockReturnValue(mockServiceClient as any)

      const catchServiceClient = createMockServiceClient()
      // Second call to createServiceClient is in the catch block
      vi.mocked(createServiceClient)
        .mockReturnValueOnce(mockServiceClient as any)
        .mockReturnValueOnce(catchServiceClient as any)

      const response = await POST(makeRequest({
        user_payment_id: PAYMENT_ID,
        payment_proof_url: 'uploads/proof.jpg',
      }))

      expect(response.status).toBe(500)
      expect(updatePaymentExtraction).toHaveBeenCalledWith(
        catchServiceClient,
        PAYMENT_ID,
        expect.objectContaining({ extraction_status: 'failed' })
      )
    })
  })
})
