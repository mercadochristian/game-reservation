import { describe, it, expect } from 'vitest'
import {
  countPositions,
  getRequiredPositions,
  validateGroupPositions,
  validateTeamPositions,
} from '../registration-positions'
import { GroupPlayer } from '@/lib/validations/group-registration'

describe('registration-positions', () => {
  describe('getRequiredPositions', () => {
    it('returns the required position composition for a team', () => {
      const required = getRequiredPositions()
      expect(required).toEqual({
        setter: 1,
        middle_blocker: 2,
        open_spiker: 2,
        opposite_spiker: 1,
      })
    })
  })

  describe('countPositions', () => {
    it('counts regular positions correctly', () => {
      const players: GroupPlayer[] = [
        {
          type: 'existing',
          user_id: '1',
          preferred_position: 'setter',
        } as any,
        {
          type: 'existing',
          user_id: '2',
          preferred_position: 'middle_blocker',
        } as any,
        {
          type: 'existing',
          user_id: '3',
          preferred_position: 'open_spiker',
        } as any,
        {
          type: 'existing',
          user_id: '4',
          preferred_position: 'opposite_spiker',
        } as any,
      ]

      const counts = countPositions(players)
      expect(counts).toEqual({
        setter: 1,
        middle_blocker: 1,
        open_spiker: 1,
        opposite_spiker: 1,
      })
    })

    it('treats middle_setter as a setter', () => {
      const players: GroupPlayer[] = [
        {
          type: 'guest',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          preferred_position: 'middle_setter',
        } as any,
        {
          type: 'guest',
          first_name: 'Jane',
          last_name: 'Doe',
          email: 'jane@example.com',
          preferred_position: 'setter',
        } as any,
      ]

      const counts = countPositions(players)
      expect(counts.setter).toBe(2)
    })

    it('handles empty array', () => {
      const counts = countPositions([])
      expect(counts).toEqual({
        setter: 0,
        middle_blocker: 0,
        open_spiker: 0,
        opposite_spiker: 0,
      })
    })

    it('ignores invalid positions', () => {
      const players: GroupPlayer[] = [
        {
          type: 'existing',
          user_id: '1',
          preferred_position: 'setter',
        } as any,
        {
          type: 'existing',
          user_id: '2',
          preferred_position: 'invalid_position' as any,
        } as any,
      ]

      const counts = countPositions(players)
      expect(counts.setter).toBe(1)
      expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(1)
    })
  })

  describe('validateTeamPositions', () => {
    it('validates a complete team with required positions', () => {
      const players: GroupPlayer[] = [
        { preferred_position: 'setter' } as any,
        { preferred_position: 'middle_blocker' } as any,
        { preferred_position: 'middle_blocker' } as any,
        { preferred_position: 'open_spiker' } as any,
        { preferred_position: 'open_spiker' } as any,
        { preferred_position: 'opposite_spiker' } as any,
      ]

      const required = getRequiredPositions()
      const result = validateTeamPositions(players, required)

      expect(result.valid).toBe(true)
      expect(result.missing).toBeUndefined()
    })

    it('detects missing setter', () => {
      const players: GroupPlayer[] = [
        { preferred_position: 'middle_blocker' } as any,
        { preferred_position: 'middle_blocker' } as any,
        { preferred_position: 'open_spiker' } as any,
        { preferred_position: 'open_spiker' } as any,
        { preferred_position: 'opposite_spiker' } as any,
      ]

      const required = getRequiredPositions()
      const result = validateTeamPositions(players, required)

      expect(result.valid).toBe(false)
      expect(result.missing).toContainEqual({
        position: 'setter',
        required: 1,
        provided: 0,
      })
    })

    it('detects insufficient middle blockers', () => {
      const players: GroupPlayer[] = [
        { preferred_position: 'setter' } as any,
        { preferred_position: 'middle_blocker' } as any,
        { preferred_position: 'open_spiker' } as any,
        { preferred_position: 'open_spiker' } as any,
        { preferred_position: 'opposite_spiker' } as any,
      ]

      const required = getRequiredPositions()
      const result = validateTeamPositions(players, required)

      expect(result.valid).toBe(false)
      expect(result.missing).toContainEqual({
        position: 'middle_blocker',
        required: 2,
        provided: 1,
      })
    })

    it('allows middle_setter to count as setter', () => {
      const players: GroupPlayer[] = [
        { preferred_position: 'middle_setter' } as any,
        { preferred_position: 'middle_blocker' } as any,
        { preferred_position: 'middle_blocker' } as any,
        { preferred_position: 'open_spiker' } as any,
        { preferred_position: 'open_spiker' } as any,
        { preferred_position: 'opposite_spiker' } as any,
      ]

      const required = getRequiredPositions()
      const result = validateTeamPositions(players, required)

      expect(result.valid).toBe(true)
    })
  })

  describe('validateGroupPositions', () => {
    it('validates a valid group with correct position counts', () => {
      const players: GroupPlayer[] = [
        { preferred_position: 'setter' } as any,
        { preferred_position: 'middle_blocker' } as any,
        { preferred_position: 'open_spiker' } as any,
      ]

      const result = validateGroupPositions(players)

      expect(result.valid).toBe(true)
      expect(result.issues).toBeUndefined()
    })

    it('detects too many setters (max 1)', () => {
      const players: GroupPlayer[] = [
        { preferred_position: 'setter' } as any,
        { preferred_position: 'setter' } as any,
        { preferred_position: 'middle_blocker' } as any,
      ]

      const result = validateGroupPositions(players)

      expect(result.valid).toBe(false)
      expect(result.issues).toContainEqual({
        position: 'setter',
        max: 1,
        provided: 2,
      })
    })

    it('detects too many opposite spikers (max 1)', () => {
      const players: GroupPlayer[] = [
        { preferred_position: 'setter' } as any,
        { preferred_position: 'opposite_spiker' } as any,
        { preferred_position: 'opposite_spiker' } as any,
      ]

      const result = validateGroupPositions(players)

      expect(result.valid).toBe(false)
      expect(result.issues).toContainEqual({
        position: 'opposite_spiker',
        max: 1,
        provided: 2,
      })
    })

    it('detects too many middle blockers (max 2)', () => {
      const players: GroupPlayer[] = [
        { preferred_position: 'middle_blocker' } as any,
        { preferred_position: 'middle_blocker' } as any,
        { preferred_position: 'middle_blocker' } as any,
      ]

      const result = validateGroupPositions(players)

      expect(result.valid).toBe(false)
      expect(result.issues).toContainEqual({
        position: 'middle_blocker',
        max: 2,
        provided: 3,
      })
    })

    it('detects too many open spikers (max 2)', () => {
      const players: GroupPlayer[] = [
        { preferred_position: 'open_spiker' } as any,
        { preferred_position: 'open_spiker' } as any,
        { preferred_position: 'open_spiker' } as any,
      ]

      const result = validateGroupPositions(players)

      expect(result.valid).toBe(false)
      expect(result.issues).toContainEqual({
        position: 'open_spiker',
        max: 2,
        provided: 3,
      })
    })

    it('allows middle_setter to count as setter in group position validation', () => {
      const players: GroupPlayer[] = [
        { preferred_position: 'middle_setter' } as any,
        { preferred_position: 'open_spiker' } as any,
      ]

      const result = validateGroupPositions(players)

      expect(result.valid).toBe(true)
    })

    it('detects multiple position violations', () => {
      const players: GroupPlayer[] = [
        { preferred_position: 'setter' } as any,
        { preferred_position: 'setter' } as any,
        { preferred_position: 'middle_blocker' } as any,
        { preferred_position: 'middle_blocker' } as any,
        { preferred_position: 'middle_blocker' } as any,
      ]

      const result = validateGroupPositions(players)

      expect(result.valid).toBe(false)
      expect(result.issues?.length).toBe(2)
      expect(result.issues).toContainEqual({
        position: 'setter',
        max: 1,
        provided: 2,
      })
      expect(result.issues).toContainEqual({
        position: 'middle_blocker',
        max: 2,
        provided: 3,
      })
    })
  })
})
