import { describe, it, expect } from 'vitest'
import { locationSchema } from '../location'

describe('locationSchema', () => {
  describe('valid inputs', () => {
    it('accepts minimal valid object (name + is_active)', () => {
      const result = locationSchema.safeParse({
        name: 'Gym',
        is_active: true,
      })
      expect(result.success).toBe(true)
    })

    it('accepts all fields with valid URL', () => {
      const result = locationSchema.safeParse({
        name: 'Gym A',
        address: '123 Main St',
        google_map_url: 'https://maps.google.com/place/test',
        notes: 'Air conditioned',
        is_active: true,
      })
      expect(result.success).toBe(true)
    })

    it('accepts with is_active: false', () => {
      const result = locationSchema.safeParse({
        name: 'Closed Gym',
        is_active: false,
      })
      expect(result.success).toBe(true)
    })

    it('accepts address as null', () => {
      const result = locationSchema.safeParse({
        name: 'Gym',
        address: null,
        is_active: true,
      })
      expect(result.success).toBe(true)
    })

    it('accepts address omitted (optional)', () => {
      const result = locationSchema.safeParse({
        name: 'Gym',
        is_active: true,
      })
      expect(result.success).toBe(true)
    })

    it('accepts google_map_url as null', () => {
      const result = locationSchema.safeParse({
        name: 'Gym',
        google_map_url: null,
        is_active: true,
      })
      expect(result.success).toBe(true)
    })

    it('accepts google_map_url omitted (optional)', () => {
      const result = locationSchema.safeParse({
        name: 'Gym',
        is_active: true,
      })
      expect(result.success).toBe(true)
    })

    it('accepts notes as null', () => {
      const result = locationSchema.safeParse({
        name: 'Gym',
        notes: null,
        is_active: true,
      })
      expect(result.success).toBe(true)
    })

    it('accepts notes omitted (optional)', () => {
      const result = locationSchema.safeParse({
        name: 'Gym',
        is_active: true,
      })
      expect(result.success).toBe(true)
    })
  })

  describe('name field validation', () => {
    it('rejects empty name', () => {
      const result = locationSchema.safeParse({
        name: '',
        is_active: true,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const nameIssue = result.error.issues.find(i => i.path.includes('name'))
        expect(nameIssue?.message).toContain('Location name is required')
      }
    })

    it('rejects name exceeding 255 characters', () => {
      const result = locationSchema.safeParse({
        name: 'a'.repeat(256),
        is_active: true,
      })
      expect(result.success).toBe(false)
    })

    it('rejects missing name', () => {
      const result = locationSchema.safeParse({
        is_active: true,
      })
      expect(result.success).toBe(false)
    })

    it('accepts name of exactly 255 characters', () => {
      const result = locationSchema.safeParse({
        name: 'a'.repeat(255),
        is_active: true,
      })
      expect(result.success).toBe(true)
    })
  })

  describe('is_active field validation', () => {
    it('rejects missing is_active', () => {
      const result = locationSchema.safeParse({
        name: 'Gym',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const activeIssue = result.error.issues.find(i => i.path.includes('is_active'))
        expect(activeIssue).toBeDefined()
      }
    })

    it('rejects non-boolean is_active', () => {
      const result = locationSchema.safeParse({
        name: 'Gym',
        is_active: 'true',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('google_map_url field validation', () => {
    it('rejects invalid URL format', () => {
      const result = locationSchema.safeParse({
        name: 'Gym',
        google_map_url: 'not-a-url',
        is_active: true,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const urlIssue = result.error.issues.find(i => i.path.includes('google_map_url'))
        expect(urlIssue?.message).toContain('Must be a valid URL')
      }
    })

    it('accepts valid https URL', () => {
      const result = locationSchema.safeParse({
        name: 'Gym',
        google_map_url: 'https://maps.google.com',
        is_active: true,
      })
      expect(result.success).toBe(true)
    })

    it('accepts valid http URL', () => {
      const result = locationSchema.safeParse({
        name: 'Gym',
        google_map_url: 'http://example.com',
        is_active: true,
      })
      expect(result.success).toBe(true)
    })

    it('rejects URL exceeding 500 characters', () => {
      const result = locationSchema.safeParse({
        name: 'Gym',
        google_map_url: 'https://' + 'a'.repeat(494),
        is_active: true,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('address field validation', () => {
    it('rejects address exceeding 500 characters', () => {
      const result = locationSchema.safeParse({
        name: 'Gym',
        address: 'a'.repeat(501),
        is_active: true,
      })
      expect(result.success).toBe(false)
    })

    it('accepts address of exactly 500 characters', () => {
      const result = locationSchema.safeParse({
        name: 'Gym',
        address: 'a'.repeat(500),
        is_active: true,
      })
      expect(result.success).toBe(true)
    })
  })

  describe('notes field validation', () => {
    it('rejects notes exceeding 1000 characters', () => {
      const result = locationSchema.safeParse({
        name: 'Gym',
        notes: 'a'.repeat(1001),
        is_active: true,
      })
      expect(result.success).toBe(false)
    })

    it('accepts notes of exactly 1000 characters', () => {
      const result = locationSchema.safeParse({
        name: 'Gym',
        notes: 'a'.repeat(1000),
        is_active: true,
      })
      expect(result.success).toBe(true)
    })
  })
})
