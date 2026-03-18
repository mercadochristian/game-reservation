import { describe, it, expect } from 'vitest'
import { userSearchSchema } from '../user-search'

describe('userSearchSchema', () => {
  describe('valid inputs', () => {
    it('accepts valid 4-character alphanumeric query', () => {
      const result = userSearchSchema.safeParse({ q: 'john' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.q).toBe('john')
      }
    })

    it('accepts 2-character query (minimum boundary)', () => {
      const result = userSearchSchema.safeParse({ q: 'ab' })
      expect(result.success).toBe(true)
    })

    it('accepts 100-character query (maximum boundary)', () => {
      const result = userSearchSchema.safeParse({ q: 'a'.repeat(100) })
      expect(result.success).toBe(true)
    })

    it('accepts query with @ symbol', () => {
      const result = userSearchSchema.safeParse({ q: 'user@example.com' })
      expect(result.success).toBe(true)
    })

    it('accepts query with apostrophe', () => {
      const result = userSearchSchema.safeParse({ q: "O'Brien" })
      expect(result.success).toBe(true)
    })

    it('accepts query with + symbol', () => {
      const result = userSearchSchema.safeParse({ q: '+63' })
      expect(result.success).toBe(true)
    })

    it('accepts query with - symbol', () => {
      const result = userSearchSchema.safeParse({ q: 'first-name' })
      expect(result.success).toBe(true)
    })

    it('accepts query with underscore', () => {
      const result = userSearchSchema.safeParse({ q: 'user_name' })
      expect(result.success).toBe(true)
    })

    it('accepts query with dot', () => {
      const result = userSearchSchema.safeParse({ q: 'john.doe' })
      expect(result.success).toBe(true)
    })

    it('accepts query with whitespace', () => {
      const result = userSearchSchema.safeParse({ q: 'john doe' })
      expect(result.success).toBe(true)
    })

    it('accepts query with multiple spaces (2+ spaces)', () => {
      const result = userSearchSchema.safeParse({ q: '  ' })
      expect(result.success).toBe(true)
    })

    it('accepts mixed case alphanumeric', () => {
      const result = userSearchSchema.safeParse({ q: 'JoHn123' })
      expect(result.success).toBe(true)
    })
  })

  describe('minimum length validation', () => {
    it('rejects 1-character query', () => {
      const result = userSearchSchema.safeParse({ q: 'a' })
      expect(result.success).toBe(false)
      if (!result.success) {
        const qIssue = result.error.issues.find(i => i.path.includes('q'))
        expect(qIssue?.message).toContain('at least 2 characters')
      }
    })

    it('rejects empty string', () => {
      const result = userSearchSchema.safeParse({ q: '' })
      expect(result.success).toBe(false)
    })
  })

  describe('maximum length validation', () => {
    it('rejects 101-character query', () => {
      const result = userSearchSchema.safeParse({ q: 'a'.repeat(101) })
      expect(result.success).toBe(false)
      if (!result.success) {
        const qIssue = result.error.issues.find(i => i.path.includes('q'))
        expect(qIssue?.message).toContain('fewer than 100 characters')
      }
    })
  })

  describe('regex validation (character restrictions)', () => {
    it('rejects query with % character', () => {
      const result = userSearchSchema.safeParse({ q: 'test%query' })
      expect(result.success).toBe(false)
      if (!result.success) {
        const qIssue = result.error.issues.find(i => i.path.includes('q'))
        expect(qIssue?.message).toContain('invalid characters')
      }
    })

    it('accepts query with hyphens (allowed character)', () => {
      const result = userSearchSchema.safeParse({ q: 'first-name-last' })
      expect(result.success).toBe(true)
    })

    it('rejects query with ; (SQL injection)', () => {
      const result = userSearchSchema.safeParse({ q: "'; DROP TABLE" })
      expect(result.success).toBe(false)
    })

    it('rejects query with * wildcard', () => {
      const result = userSearchSchema.safeParse({ q: 'test*' })
      expect(result.success).toBe(false)
    })

    it('rejects query with ? character', () => {
      const result = userSearchSchema.safeParse({ q: 'what?' })
      expect(result.success).toBe(false)
    })

    it('rejects query with # character', () => {
      const result = userSearchSchema.safeParse({ q: '#hashtag' })
      expect(result.success).toBe(false)
    })

    it('rejects query with ! character', () => {
      const result = userSearchSchema.safeParse({ q: 'hello!' })
      expect(result.success).toBe(false)
    })

    it('rejects query with parentheses', () => {
      const result = userSearchSchema.safeParse({ q: 'john(doe)' })
      expect(result.success).toBe(false)
    })

    it('rejects query with backslash', () => {
      const result = userSearchSchema.safeParse({ q: 'test\\query' })
      expect(result.success).toBe(false)
    })

    it('rejects query with pipe character', () => {
      const result = userSearchSchema.safeParse({ q: 'test|query' })
      expect(result.success).toBe(false)
    })
  })

  describe('missing input', () => {
    it('rejects missing q field', () => {
      const result = userSearchSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })
})
