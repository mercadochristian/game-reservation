import { describe, it, expect } from 'vitest'
import { loginSchema } from '../auth'

describe('loginSchema', () => {
  describe('valid inputs', () => {
    it('accepts valid email and password', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'password123',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('user@example.com')
        expect(result.data.password).toBe('password123')
      }
    })

    it('accepts password of exactly 6 characters (minimum boundary)', () => {
      const result = loginSchema.safeParse({
        email: 'test@test.com',
        password: 'abcdef',
      })
      expect(result.success).toBe(true)
    })

    it('accepts password of exactly 72 characters (maximum boundary)', () => {
      const result = loginSchema.safeParse({
        email: 'test@test.com',
        password: 'a'.repeat(72),
      })
      expect(result.success).toBe(true)
    })
  })

  describe('email field validation', () => {
    it('rejects invalid email format', () => {
      const result = loginSchema.safeParse({
        email: 'not-an-email',
        password: 'password123',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(i => i.message.includes('valid email'))).toBe(true)
      }
    })

    it('rejects empty email', () => {
      const result = loginSchema.safeParse({
        email: '',
        password: 'password123',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const emailIssue = result.error.issues.find(i => i.path.includes('email'))
        expect(emailIssue?.message).toContain('Please enter your email address')
      }
    })

    it('rejects missing email', () => {
      const result = loginSchema.safeParse({
        password: 'password123',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const emailIssue = result.error.issues.find(i => i.path.includes('email'))
        expect(emailIssue).toBeDefined()
      }
    })

    it('rejects email with special characters but no @', () => {
      const result = loginSchema.safeParse({
        email: 'userexample.com',
        password: 'password123',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('password field validation', () => {
    it('rejects password less than 6 characters', () => {
      const result = loginSchema.safeParse({
        email: 'test@test.com',
        password: 'abc',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const passwordIssue = result.error.issues.find(
          i => i.path.includes('password') && i.message.includes('at least 6')
        )
        expect(passwordIssue).toBeDefined()
      }
    })

    it('rejects password of 5 characters', () => {
      const result = loginSchema.safeParse({
        email: 'test@test.com',
        password: 'abcde',
      })
      expect(result.success).toBe(false)
    })

    it('rejects password longer than 72 characters', () => {
      const result = loginSchema.safeParse({
        email: 'test@test.com',
        password: 'a'.repeat(73),
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const passwordIssue = result.error.issues.find(
          i => i.path.includes('password') && i.message.includes('fewer than 72')
        )
        expect(passwordIssue).toBeDefined()
      }
    })

    it('rejects empty password', () => {
      const result = loginSchema.safeParse({
        email: 'test@test.com',
        password: '',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const passwordIssue = result.error.issues.find(i => i.path.includes('password'))
        expect(passwordIssue?.message).toContain('Please enter your password')
      }
    })

    it('rejects missing password', () => {
      const result = loginSchema.safeParse({
        email: 'test@test.com',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('both fields empty', () => {
    it('rejects when both email and password are empty', () => {
      const result = loginSchema.safeParse({
        email: '',
        password: '',
      })
      expect(result.success).toBe(false)
      expect(result.error?.issues.length).toBeGreaterThanOrEqual(2)
    })

    it('rejects when both fields are missing', () => {
      const result = loginSchema.safeParse({})
      expect(result.success).toBe(false)
      expect(result.error?.issues.length).toBeGreaterThanOrEqual(2)
    })
  })
})
