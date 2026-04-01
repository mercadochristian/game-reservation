import { describe, it, expect } from 'vitest'
import { groupRegistrationSchema } from '@/lib/validations/group-registration'

describe('groupRegistrationSchema - registration_note validation', () => {
  const basePayload = {
    schedule_id: '550e8400-e29b-41d4-a716-446655440000',
    payment_proof_path: '/proof/payment.jpg',
    registration_mode: 'group' as const,
    players: [
      {
        type: 'existing' as const,
        user_id: '550e8400-e29b-41d4-a716-446655440001',
        preferred_position: 'open_spiker' as const,
      },
      {
        type: 'guest' as const,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        preferred_position: 'setter' as const,
        skill_level: 'intermediate' as const,
      },
    ],
  }

  it('should reject registration_note exceeding 200 characters', () => {
    const noteExceedingLimit = 'a'.repeat(201)
    expect(() =>
      groupRegistrationSchema.parse({
        ...basePayload,
        registration_note: noteExceedingLimit,
      })
    ).toThrow('Note cannot exceed 200 characters')
  })

  it('should accept registration_note at exactly 200 characters', () => {
    const noteAtLimit = 'a'.repeat(200)
    const result = groupRegistrationSchema.parse({
      ...basePayload,
      registration_note: noteAtLimit,
    })
    expect(result.registration_note).toBe(noteAtLimit)
  })

  it('should accept null registration_note', () => {
    const result = groupRegistrationSchema.parse({
      ...basePayload,
      registration_note: null,
    })
    expect(result.registration_note).toBe(null)
  })

  it('should accept undefined registration_note', () => {
    const result = groupRegistrationSchema.parse({
      ...basePayload,
      // registration_note omitted = undefined
    })
    expect(result.registration_note).toBeUndefined()
  })

  it('should accept empty string registration_note', () => {
    const result = groupRegistrationSchema.parse({
      ...basePayload,
      registration_note: '',
    })
    expect(result.registration_note).toBe('')
  })
})
