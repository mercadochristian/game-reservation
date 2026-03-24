import type { Database, SkillLevel } from './database'

export type { SkillLevel }
export type { PlayerPosition } from './database'

// Table Row types (full DB records)
export type User = Database['public']['Tables']['users']['Row']
export type Schedule = Database['public']['Tables']['schedules']['Row']
export type Registration = Database['public']['Tables']['registrations']['Row']
export type Team = Database['public']['Tables']['teams']['Row']
export type TeamMember = Database['public']['Tables']['team_members']['Row']
export type MvpAward = Database['public']['Tables']['mvp_awards']['Row']
export type Location = Database['public']['Tables']['locations']['Row']
export type PaymentChannel = Database['public']['Tables']['payment_channels']['Row']
export type UserPayment = Database['public']['Tables']['user_payments']['Row']
export type RoleWhitelist = Database['public']['Tables']['role_whitelist']['Row']
export type Log = Database['public']['Tables']['logs']['Row']

// Enum types
export type UserRole = Database['public']['Enums']['user_role']
export type ScheduleStatus = Database['public']['Enums']['schedule_status']
export type PaymentStatus = Database['public']['Enums']['payment_status']
export type TeamPreference = Database['public']['Enums']['team_preference']

// Convenience types
export type ScheduleWithLocation = Schedule & {
  locations: Pick<Location, 'id' | 'name'>
}

export type RegistrationWithDetails = Registration & {
  users: Pick<User, 'id' | 'first_name' | 'last_name' | 'email' | 'skill_level' | 'is_guest'>
  team_members: Array<{ team_id: string; teams: Pick<Team, 'id' | 'name'> | null }>
}

export type ScheduleWithSlots = ScheduleWithLocation & {
  registration_count: number
}

// Map of schedule_id -> position key -> registered count
export type PositionCountMap = Record<string, Record<string, number>>

// Insert types (for creating new records)
export type ScheduleInsert = Database['public']['Tables']['schedules']['Insert']
export type RegistrationInsert = Database['public']['Tables']['registrations']['Insert']
export type TeamInsert = Database['public']['Tables']['teams']['Insert']
export type MvpAwardInsert = Database['public']['Tables']['mvp_awards']['Insert']
export type LocationInsert = Database['public']['Tables']['locations']['Insert']
export type PaymentChannelInsert = Database['public']['Tables']['payment_channels']['Insert']
