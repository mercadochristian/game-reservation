import type { UserRole } from '@/types'

export type EditableField = 'first_name' | 'last_name' | 'email' | 'player_contact_number' | 'emergency_contact_name' | 'emergency_contact_relationship' | 'emergency_contact_number' | 'role' | 'skill_level'

/**
 * Check if a user role can edit a specific field
 */
export function canEditField(userRole: UserRole, field: EditableField): boolean {
  if (userRole === 'super_admin') return true

  // Admin can edit all fields (role assignments are validated separately)
  if (userRole === 'admin') {
    return true
  }

  if (userRole === 'facilitator') {
    return field === 'skill_level'
  }

  return false
}

/**
 * Check if a user can assign a specific role
 */
export function canAssignRole(userRole: UserRole, targetRole: UserRole): boolean {
  if (userRole === 'super_admin') return true

  if (userRole === 'admin') {
    return targetRole === 'player' || targetRole === 'facilitator'
  }

  return false
}

/**
 * Get assignable roles for a user role
 */
export function getAssignableRoles(userRole: UserRole): UserRole[] {
  if (userRole === 'super_admin') {
    return ['admin', 'player', 'facilitator', 'super_admin']
  }

  if (userRole === 'admin') {
    return ['player', 'facilitator']
  }

  return []
}
