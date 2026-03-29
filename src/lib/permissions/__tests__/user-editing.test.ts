import { describe, it, expect } from 'vitest'
import type { EditableField } from '../user-editing'
import { canEditField, canAssignRole, getAssignableRoles } from '../user-editing'

describe('user-editing permissions', () => {
  describe('canEditField', () => {
    it('should allow super_admin to edit all fields', () => {
      expect(canEditField('super_admin', 'first_name')).toBe(true)
      expect(canEditField('super_admin', 'role')).toBe(true)
      expect(canEditField('super_admin', 'skill_level')).toBe(true)
    })

    it('should allow admin to edit all fields', () => {
      const allEditableFields: EditableField[] = [
        'first_name',
        'last_name',
        'email',
        'player_contact_number',
        'emergency_contact_name',
        'emergency_contact_relationship',
        'emergency_contact_number',
        'role',
        'skill_level',
      ]
      allEditableFields.forEach(field => {
        expect(canEditField('admin', field)).toBe(true)
      })
    })

    it('should allow facilitator to edit only skill_level', () => {
      expect(canEditField('facilitator', 'skill_level')).toBe(true)
      expect(canEditField('facilitator', 'first_name')).toBe(false)
      expect(canEditField('facilitator', 'role')).toBe(false)
      expect(canEditField('facilitator', 'email')).toBe(false)
    })

    it('should deny player from editing any field', () => {
      expect(canEditField('player', 'skill_level')).toBe(false)
      expect(canEditField('player', 'first_name')).toBe(false)
    })
  })

  describe('canAssignRole', () => {
    it('should allow super_admin to assign any role', () => {
      expect(canAssignRole('super_admin', 'admin')).toBe(true)
      expect(canAssignRole('super_admin', 'player')).toBe(true)
      expect(canAssignRole('super_admin', 'facilitator')).toBe(true)
      expect(canAssignRole('super_admin', 'super_admin')).toBe(true)
    })

    it('should allow admin to assign only player and facilitator', () => {
      expect(canAssignRole('admin', 'player')).toBe(true)
      expect(canAssignRole('admin', 'facilitator')).toBe(true)
      expect(canAssignRole('admin', 'admin')).toBe(false)
      expect(canAssignRole('admin', 'super_admin')).toBe(false)
    })

    it('should deny facilitator from assigning roles', () => {
      expect(canAssignRole('facilitator', 'player')).toBe(false)
      expect(canAssignRole('facilitator', 'admin')).toBe(false)
    })
  })

  describe('getAssignableRoles', () => {
    it('should return all roles for super_admin', () => {
      const roles = getAssignableRoles('super_admin')
      expect(roles).toContain('admin')
      expect(roles).toContain('player')
      expect(roles).toContain('facilitator')
      expect(roles).toContain('super_admin')
    })

    it('should return only player and facilitator for admin', () => {
      const roles = getAssignableRoles('admin')
      expect(roles).toEqual(['player', 'facilitator'])
    })

    it('should return empty array for facilitator', () => {
      expect(getAssignableRoles('facilitator')).toEqual([])
    })

    it('should return empty array for player', () => {
      expect(getAssignableRoles('player')).toEqual([])
    })
  })
})
