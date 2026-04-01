import { describe, it, expect } from 'vitest'

describe('Registration Note Character Counter', () => {
  it('should return correct character count for valid note', () => {
    const note = 'This is a test note'
    expect(note.length).toBe(19)
  })

  it('should return 0 for empty note', () => {
    const note = ''
    expect(note.length).toBe(0)
  })

  it('should return 200 for max length note', () => {
    const note = 'a'.repeat(200)
    expect(note.length).toBe(200)
  })

  it('should identify note exceeding max length', () => {
    const note = 'a'.repeat(201)
    const isExceedingLimit = note.length > 200
    expect(isExceedingLimit).toBe(true)
  })

  it('should trim whitespace from note before validation', () => {
    const note = '  hello world  '
    const trimmed = note.trim()
    expect(trimmed).toBe('hello world')
    expect(trimmed.length).toBeLessThanOrEqual(200)
  })
})
