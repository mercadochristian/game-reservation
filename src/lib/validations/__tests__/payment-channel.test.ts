import { describe, it, expect } from 'vitest'
import { paymentChannelSchema, PAYMENT_PROVIDERS } from '../payment-channel'

describe('PAYMENT_PROVIDERS', () => {
  it('contains all 7 providers', () => {
    expect(PAYMENT_PROVIDERS).toHaveLength(7)
  })

  it('includes GCash, Maya, BPI, BDO, Metrobank, UnionBank, Other', () => {
    expect(PAYMENT_PROVIDERS).toContain('GCash')
    expect(PAYMENT_PROVIDERS).toContain('Maya')
    expect(PAYMENT_PROVIDERS).toContain('BPI')
    expect(PAYMENT_PROVIDERS).toContain('BDO')
    expect(PAYMENT_PROVIDERS).toContain('Metrobank')
    expect(PAYMENT_PROVIDERS).toContain('UnionBank')
    expect(PAYMENT_PROVIDERS).toContain('Other')
  })
})

describe('paymentChannelSchema', () => {
  const validChannel = {
    name: 'Main GCash Account',
    provider: 'GCash',
    account_number: '09171234567',
    account_holder_name: 'John Doe',
    is_active: true,
  }

  describe('valid inputs', () => {
    it('accepts valid complete payment channel', () => {
      const result = paymentChannelSchema.safeParse(validChannel)
      expect(result.success).toBe(true)
    })

    it('accepts all 7 valid provider values', () => {
      PAYMENT_PROVIDERS.forEach(provider => {
        const result = paymentChannelSchema.safeParse({
          ...validChannel,
          provider,
        })
        expect(result.success).toBe(true)
      })
    })

    it('accepts is_active: true', () => {
      const result = paymentChannelSchema.safeParse({
        ...validChannel,
        is_active: true,
      })
      expect(result.success).toBe(true)
    })

    it('accepts is_active: false', () => {
      const result = paymentChannelSchema.safeParse({
        ...validChannel,
        is_active: false,
      })
      expect(result.success).toBe(true)
    })
  })

  describe('name field validation', () => {
    it('rejects empty name', () => {
      const result = paymentChannelSchema.safeParse({
        ...validChannel,
        name: '',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find(i => i.path.includes('name'))
        expect(issue?.message).toContain('Channel name is required')
      }
    })

    it('rejects missing name', () => {
      const { name, ...rest } = validChannel
      const result = paymentChannelSchema.safeParse(rest)
      expect(result.success).toBe(false)
    })

    it('accepts name at max length (255 chars)', () => {
      const result = paymentChannelSchema.safeParse({
        ...validChannel,
        name: 'a'.repeat(255),
      })
      expect(result.success).toBe(true)
    })

    it('rejects name exceeding 255 chars', () => {
      const result = paymentChannelSchema.safeParse({
        ...validChannel,
        name: 'a'.repeat(256),
      })
      expect(result.success).toBe(false)
    })
  })

  describe('provider field validation', () => {
    it('coerces invalid provider to GCash (first default)', () => {
      const result = paymentChannelSchema.safeParse({
        ...validChannel,
        provider: 'InvalidProvider',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.provider).toBe('GCash')
      }
    })

    it('coerces missing provider to GCash', () => {
      const { provider, ...rest } = validChannel
      const result = paymentChannelSchema.safeParse(rest)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.provider).toBe('GCash')
      }
    })
  })

  describe('account_number field validation', () => {
    it('rejects empty account_number', () => {
      const result = paymentChannelSchema.safeParse({
        ...validChannel,
        account_number: '',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find(i => i.path.includes('account_number'))
        expect(issue?.message).toContain('Account number is required')
      }
    })

    it('rejects missing account_number', () => {
      const { account_number, ...rest } = validChannel
      const result = paymentChannelSchema.safeParse(rest)
      expect(result.success).toBe(false)
    })

    it('accepts account_number at max length (100 chars)', () => {
      const result = paymentChannelSchema.safeParse({
        ...validChannel,
        account_number: 'a'.repeat(100),
      })
      expect(result.success).toBe(true)
    })

    it('rejects account_number exceeding 100 chars', () => {
      const result = paymentChannelSchema.safeParse({
        ...validChannel,
        account_number: 'a'.repeat(101),
      })
      expect(result.success).toBe(false)
    })
  })

  describe('account_holder_name field validation', () => {
    it('rejects empty account_holder_name', () => {
      const result = paymentChannelSchema.safeParse({
        ...validChannel,
        account_holder_name: '',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find(i => i.path.includes('account_holder_name'))
        expect(issue?.message).toContain('Account holder name is required')
      }
    })

    it('rejects missing account_holder_name', () => {
      const { account_holder_name, ...rest } = validChannel
      const result = paymentChannelSchema.safeParse(rest)
      expect(result.success).toBe(false)
    })

    it('accepts account_holder_name at max length (255 chars)', () => {
      const result = paymentChannelSchema.safeParse({
        ...validChannel,
        account_holder_name: 'a'.repeat(255),
      })
      expect(result.success).toBe(true)
    })

    it('rejects account_holder_name exceeding 255 chars', () => {
      const result = paymentChannelSchema.safeParse({
        ...validChannel,
        account_holder_name: 'a'.repeat(256),
      })
      expect(result.success).toBe(false)
    })
  })

  describe('is_active field validation', () => {
    it('rejects non-boolean is_active', () => {
      const result = paymentChannelSchema.safeParse({
        ...validChannel,
        is_active: 'true',
      })
      expect(result.success).toBe(false)
    })

    it('rejects missing is_active', () => {
      const { is_active, ...rest } = validChannel
      const result = paymentChannelSchema.safeParse(rest)
      expect(result.success).toBe(false)
    })
  })
})
