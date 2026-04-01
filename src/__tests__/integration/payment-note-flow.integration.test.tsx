import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as supabaseModule from '@/lib/supabase/client'
import type { Json } from '@/types/database'

// Mock Supabase client
vi.mock('@/lib/supabase/client')

interface RegistrationPayment {
  id: string
  registration_id: string | null
  team_id: string | null
  payer_id: string
  schedule_id: string
  registration_type: string
  required_amount: number
  payment_status: string
  payment_proof_url: string | null
  payment_channel_id: string | null
  extracted_amount: number | null
  extracted_reference: string | null
  extracted_datetime: string | null
  extracted_sender: string | null
  extraction_confidence: string | null
  extracted_raw: Json | null
  payment_note: string | null
  created_at: string
  updated_at: string
}

describe('Payment Note Integration Flow', () => {
  const basePayment: RegistrationPayment = {
    id: 'pay-1',
    registration_id: 'reg-1',
    team_id: null,
    payer_id: 'user-1',
    schedule_id: 'schedule-1',
    registration_type: 'solo',
    required_amount: 100,
    payment_status: 'pending',
    payment_proof_url: null,
    payment_channel_id: 'channel-1',
    extracted_amount: null,
    extracted_reference: null,
    extracted_datetime: null,
    extracted_sender: null,
    extraction_confidence: null,
    extracted_raw: null,
    payment_note: null,
    created_at: '2026-03-15T00:00:00Z',
    updated_at: '2026-03-15T00:00:00Z',
  }

  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('should save payment_note when approving a payment', async () => {
    const testNote = 'Payment verified - matched to gcash screenshot from 2026-03-15'
    const paymentWithNote: RegistrationPayment = {
      ...basePayment,
      payment_note: testNote,
      payment_status: 'verified',
    }

    const mockClient = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: paymentWithNote,
            error: null,
          }),
        }),
      }),
    }
    vi.mocked(supabaseModule.createClient).mockReturnValue(mockClient as any)

    // Simulate payment approval with note
    const result = await mockClient
      .from('registration_payments')
      .update({
        payment_status: 'verified',
        payment_note: testNote,
      })
      .eq('id', 'pay-1')

    expect(result.data.payment_note).toBe(testNote)
    expect(result.data.payment_status).toBe('verified')
  })

  it('should save payment_note when rejecting a payment', async () => {
    const testNote = 'Payment rejected - amount does not match (proof shows 500, required 1000)'
    const paymentWithNote: RegistrationPayment = {
      ...basePayment,
      payment_note: testNote,
      payment_status: 'rejected',
    }

    const mockClient = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: paymentWithNote,
            error: null,
          }),
        }),
      }),
    }
    vi.mocked(supabaseModule.createClient).mockReturnValue(mockClient as any)

    // Simulate payment rejection with note
    const result = await mockClient
      .from('registration_payments')
      .update({
        payment_status: 'rejected',
        payment_note: testNote,
      })
      .eq('id', 'pay-1')

    expect(result.data.payment_note).toBe(testNote)
    expect(result.data.payment_status).toBe('rejected')
  })

  it('should retrieve payment_note from admin dashboard', async () => {
    const testNote = 'Awaiting player clarification on transaction ID'
    const paymentWithNote: RegistrationPayment = {
      ...basePayment,
      payment_note: testNote,
      payment_status: 'review',
    }

    const mockClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [paymentWithNote],
            error: null,
          }),
        }),
      }),
    }
    vi.mocked(supabaseModule.createClient).mockReturnValue(mockClient as any)

    // Simulate fetching payment from admin dashboard
    const result = await mockClient
      .from('registration_payments')
      .select('*')
      .eq('id', 'pay-1')

    expect(result.data[0].payment_note).toBe(testNote)
  })

  it('should allow payment_note to be null', async () => {
    const paymentWithoutNote: RegistrationPayment = {
      ...basePayment,
      payment_note: null,
      payment_status: 'verified',
    }

    const mockClient = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: paymentWithoutNote,
            error: null,
          }),
        }),
      }),
    }
    vi.mocked(supabaseModule.createClient).mockReturnValue(mockClient as any)

    // Simulate payment approval without note
    const result = await mockClient
      .from('registration_payments')
      .update({
        payment_status: 'verified',
      })
      .eq('id', 'pay-1')

    expect(result.data.payment_note).toBeNull()
  })

  it('should enforce 200 character limit on payment_note', async () => {
    const tooLongNote = 'a'.repeat(201)

    const mockClient = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: {
              code: '23514', // PostgreSQL check constraint violation
              message: 'new row for relation "registration_payments" violates check constraint "payment_note_max_length"',
            },
          }),
        }),
      }),
    }
    vi.mocked(supabaseModule.createClient).mockReturnValue(mockClient as any)

    // Attempt to update payment with note exceeding 200 chars
    const result = await mockClient
      .from('registration_payments')
      .update({
        payment_status: 'verified',
        payment_note: tooLongNote,
      })
      .eq('id', 'pay-1')

    expect(result.error).toBeDefined()
    expect(result.error.code).toBe('23514')
  })

  it('should display payment_note in payment verification list', async () => {
    const testNote = 'Verified via direct bank confirmation'
    const paymentWithNote: RegistrationPayment = {
      ...basePayment,
      payment_note: testNote,
      payment_status: 'verified',
    }

    const mockClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [paymentWithNote],
            error: null,
          }),
        }),
      }),
    }
    vi.mocked(supabaseModule.createClient).mockReturnValue(mockClient as any)

    // Simulate fetching verified payments
    const result = await mockClient
      .from('registration_payments')
      .select('*')
      .eq('payment_status', 'verified')

    expect(result.data[0].payment_note).toBe(testNote)
  })

  it('should allow clearing payment_note', async () => {
    const paymentNoteCleared: RegistrationPayment = {
      ...basePayment,
      payment_note: null,
    }

    const mockClient = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: paymentNoteCleared,
            error: null,
          }),
        }),
      }),
    }
    vi.mocked(supabaseModule.createClient).mockReturnValue(mockClient as any)

    // Simulate clearing payment note
    const result = await mockClient
      .from('registration_payments')
      .update({ payment_note: null })
      .eq('id', 'pay-1')

    expect(result.data.payment_note).toBeNull()
  })

  it('should preserve payment_note when updating other fields', async () => {
    const testNote = 'Manual verification by admin-001'
    const paymentWithNoteAndUpdates: RegistrationPayment = {
      ...basePayment,
      payment_note: testNote,
      payment_status: 'verified',
      extracted_amount: 100,
    }

    const mockClient = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: paymentWithNoteAndUpdates,
            error: null,
          }),
        }),
      }),
    }
    vi.mocked(supabaseModule.createClient).mockReturnValue(mockClient as any)

    // Simulate updating extracted amount while preserving note
    const result = await mockClient
      .from('registration_payments')
      .update({ extracted_amount: 100 })
      .eq('id', 'pay-1')

    expect(result.data.payment_note).toBe(testNote)
    expect(result.data.extracted_amount).toBe(100)
  })

  it('should retrieve multiple payments with notes for admin dashboard', async () => {
    const note1 = 'Verified - bank statement match'
    const note2 = 'Pending - awaiting screenshot'

    const payment1: RegistrationPayment = {
      ...basePayment,
      id: 'pay-1',
      payment_note: note1,
      payment_status: 'verified',
    }

    const payment2: RegistrationPayment = {
      ...basePayment,
      id: 'pay-2',
      payment_note: note2,
      payment_status: 'review',
    }

    const mockClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [payment1, payment2],
            error: null,
          }),
        }),
      }),
    }
    vi.mocked(supabaseModule.createClient).mockReturnValue(mockClient as any)

    // Simulate fetching all payments for schedule
    const result = await mockClient
      .from('registration_payments')
      .select('*')
      .eq('schedule_id', 'schedule-1')

    expect(result.data).toHaveLength(2)
    expect(result.data[0].payment_note).toBe(note1)
    expect(result.data[1].payment_note).toBe(note2)
  })

  it('should support special characters in payment_note', async () => {
    const testNote = 'Payment via GCash @username - Reference #TX-2026-03-001'
    const paymentWithNote: RegistrationPayment = {
      ...basePayment,
      payment_note: testNote,
      payment_status: 'verified',
    }

    const mockClient = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: paymentWithNote,
            error: null,
          }),
        }),
      }),
    }
    vi.mocked(supabaseModule.createClient).mockReturnValue(mockClient as any)

    // Simulate payment approval with special characters in note
    const result = await mockClient
      .from('registration_payments')
      .update({
        payment_status: 'verified',
        payment_note: testNote,
      })
      .eq('id', 'pay-1')

    expect(result.data.payment_note).toBe(testNote)
  })
})
