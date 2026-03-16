import type { Database, SkillLevel } from './database'

export type { SkillLevel }

// Table Row types (full DB records)
export type User = Database['public']['Tables']['users']['Row']
export type Schedule = Database['public']['Tables']['schedules']['Row']
export type Registration = Database['public']['Tables']['registrations']['Row']
export type Team = Database['public']['Tables']['teams']['Row']
export type TeamMember = Database['public']['Tables']['team_members']['Row']
export type MvpAward = Database['public']['Tables']['mvp_awards']['Row']
export type RoleWhitelist = Database['public']['Tables']['role_whitelist']['Row']

// Enum types
export type UserRole = Database['public']['Enums']['user_role']
export type ScheduleStatus = Database['public']['Enums']['schedule_status']
export type PaymentStatus = Database['public']['Enums']['payment_status']
export type TeamPreference = Database['public']['Enums']['team_preference']

// Insert types (for creating new records)
export type ScheduleInsert = Database['public']['Tables']['schedules']['Insert']
export type RegistrationInsert = Database['public']['Tables']['registrations']['Insert']
export type TeamInsert = Database['public']['Tables']['teams']['Insert']
export type MvpAwardInsert = Database['public']['Tables']['mvp_awards']['Insert']
