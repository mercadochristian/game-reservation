import { describe, it, expect } from 'vitest'
import { paymentEditSchema } from '../payment-edit'

describe('paymentEditSchema', () => {
  // -------------------------------------------------------------------------
  // extracted_amount validation
  // -------------------------------------------------------------------------

  it('accepts positive extracted_amount', () => {
    const result = paymentEditSchema.safeParse({
      extracted_amount: 500.50,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.extracted_amount).toBe(500.50)
    }
  })

  it('rejects zero extracted_amount', () => {
    const result = paymentEditSchema.safeParse({
      extracted_amount: 0,
    })

    expect(result.success).toBe(false)
  })

  it('rejects negative extracted_amount', () => {
    const result = paymentEditSchema.safeParse({
      extracted_amount: -100,
    })

    expect(result.success).toBe(false)
  })

  it('accepts null extracted_amount', () => {
    const result = paymentEditSchema.safeParse({
      extracted_amount: null,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.extracted_amount).toBeNull()
    }
  })

  it('accepts undefined extracted_amount', () => {
    const result = paymentEditSchema.safeParse({})

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.extracted_amount).toBeUndefined()
    }
  })

  // -------------------------------------------------------------------------
  // extracted_reference validation
  // -------------------------------------------------------------------------

  it('accepts valid extracted_reference', () => {
    const result = paymentEditSchema.safeParse({
      extracted_reference: 'REF-123456',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.extracted_reference).toBe('REF-123456')
    }
  })

  it('rejects extracted_reference exceeding 255 characters', () => {
    const longRef = 'a'.repeat(256)
    const result = paymentEditSchema.safeParse({
      extracted_reference: longRef,
    })

    expect(result.success).toBe(false)
  })

  it('accepts null extracted_reference', () => {
    const result = paymentEditSchema.safeParse({
      extracted_reference: null,
    })

    expect(result.success).toBe(true)
  })

  // -------------------------------------------------------------------------
  // extracted_datetime validation
  // -------------------------------------------------------------------------

  it('accepts valid ISO datetime for extracted_datetime', () => {
    const result = paymentEditSchema.safeParse({
      extracted_datetime: '2026-04-01T12:30:00Z',
    })

    expect(result.success).toBe(true)
  })

  it('rejects invalid datetime for extracted_datetime', () => {
    const result = paymentEditSchema.safeParse({
      extracted_datetime: 'not-a-date',
    })

    expect(result.success).toBe(false)
  })

  it('accepts null extracted_datetime', () => {
    const result = paymentEditSchema.safeParse({
      extracted_datetime: null,
    })

    expect(result.success).toBe(true)
  })

  // -------------------------------------------------------------------------
  // extracted_sender validation
  // -------------------------------------------------------------------------

  it('accepts valid extracted_sender', () => {
    const result = paymentEditSchema.safeParse({
      extracted_sender: 'John Doe',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.extracted_sender).toBe('John Doe')
    }
  })

  it('rejects extracted_sender exceeding 255 characters', () => {
    const longSender = 'a'.repeat(256)
    const result = paymentEditSchema.safeParse({
      extracted_sender: longSender,
    })

    expect(result.success).toBe(false)
  })

  it('accepts null extracted_sender', () => {
    const result = paymentEditSchema.safeParse({
      extracted_sender: null,
    })

    expect(result.success).toBe(true)
  })

  // -------------------------------------------------------------------------
  // payment_note validation
  // -------------------------------------------------------------------------

  it('accepts valid payment_note', () => {
    const result = paymentEditSchema.safeParse({
      payment_note: 'This payment is under review',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.payment_note).toBe('This payment is under review')
    }
  })

  it('accepts payment_note with exactly 200 characters', () => {
    const noteAt200 = 'a'.repeat(200)
    const result = paymentEditSchema.safeParse({
      payment_note: noteAt200,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.payment_note).toBe(noteAt200)
    }
  })

  it('rejects payment_note exceeding 200 characters', () => {
    const longNote = 'a'.repeat(201)
    const result = paymentEditSchema.safeParse({
      payment_note: longNote,
    })

    expect(result.success).toBe(false)
  })

  it('accepts null payment_note', () => {
    const result = paymentEditSchema.safeParse({
      payment_note: null,
    })

    expect(result.success).toBe(true)
  })

  it('accepts undefined payment_note', () => {
    const result = paymentEditSchema.safeParse({})

    expect(result.success).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Combination Tests
  // -------------------------------------------------------------------------

  it('accepts all fields at once', () => {
    const result = paymentEditSchema.safeParse({
      extracted_amount: 1000,
      extracted_reference: 'TXN-2026-001',
      extracted_datetime: '2026-04-01T15:45:00Z',
      extracted_sender: 'Juan dela Cruz',
      payment_note: 'Verified and approved',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({
        extracted_amount: 1000,
        extracted_reference: 'TXN-2026-001',
        extracted_datetime: '2026-04-01T15:45:00Z',
        extracted_sender: 'Juan dela Cruz',
        payment_note: 'Verified and approved',
      })
    }
  })

  it('accepts empty object (all optional)', () => {
    const result = paymentEditSchema.safeParse({})

    expect(result.success).toBe(true)
  })

  it('accepts partial update with multiple null fields', () => {
    const result = paymentEditSchema.safeParse({
      extracted_amount: 500,
      extracted_reference: null,
      extracted_sender: null,
      payment_note: 'Updated amount only',
    })

    expect(result.success).toBe(true)
  })
})
