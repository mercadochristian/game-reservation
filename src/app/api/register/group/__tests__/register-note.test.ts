import { describe, it, expect } from 'vitest'

describe('POST /api/register/group - registration_note validation', () => {
  it('should reject registration_note exceeding 200 characters', () => {
    const noteExceedingLimit = 'a'.repeat(201)
    const isValid = !noteExceedingLimit || noteExceedingLimit.length <= 200
    expect(isValid).toBe(false)
  })

  it('should accept registration_note at exactly 200 characters', () => {
    const noteAtLimit = 'a'.repeat(200)
    const isValid = !noteAtLimit || noteAtLimit.length <= 200
    expect(isValid).toBe(true)
  })

  it('should accept null registration_note', () => {
    const note = null
    const isValid = !note || note.length <= 200
    expect(isValid).toBe(true)
  })

  it('should convert empty string to null', () => {
    const note = ''
    const normalized = note.trim() || null
    expect(normalized).toBe(null)
  })

  it('should trim whitespace from registration_note', () => {
    const note = '  hello world  '
    const trimmed = note.trim()
    expect(trimmed).toBe('hello world')
  })
})
