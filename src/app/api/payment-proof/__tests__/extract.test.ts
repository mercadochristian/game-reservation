// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../extract/route'
import { createMockRequest } from '@/__tests__/helpers/next-mock'

vi.mock('@/lib/config/extraction-settings', () => ({
  getExtractionSetting: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { getExtractionSetting } from '@/lib/config/extraction-settings'
import { createClient } from '@/lib/supabase/server'

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
})
